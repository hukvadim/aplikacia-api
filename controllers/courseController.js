const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const Course = require('../models/Course'); // Модель курсів

const imgPath = path.join(__dirname, '../public/img/courses');
const filesPath = path.join(__dirname, '../public/files');

// Функція для перевірки та створення директорій
const ensureDirExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDirExists(imgPath);
ensureDirExists(filesPath);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = file.fieldname === 'img' ? imgPath : filesPath;
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`); // Замінюємо пробіли на "_"
    }
});

const upload = multer({ storage }).fields([
    { name: 'img', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]);

// Проміс-обгортка для `multer`
const uploadFiles = (req, res) => new Promise((resolve, reject) => {
    upload(req, res, (err) => {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    });
});



exports.updateCourse = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'File upload failed' });
        }

        const { _id, title, description, videoLink, article, publish } = req.body;

        const imgFile = req.files?.img ? req.files.img[0] : null;
        const filesPath = req.files?.files ? req.files.files.map(item => item.filename).join(',') : null;

        // Перевірка на обов'язкові поля
        if (!_id || !title) {
            return res.status(400).json({ error: 'ID and title are required' });
        }

        // Перевірка ширини зображення
        if (imgFile) {
            try {
                const metadata = await sharp(imgFile.path).metadata();
                if (metadata.width < 850) {
                    return res.status(400).json({
                        error: 'The image width must be at least 850px'
                    });
                }
            } catch (error) {
                console.error('Failed to validate image dimensions:', error.message);
                return res.status(500).json({ error: 'Image validation failed' });
            }
        }

        const imgPath = imgFile ? imgFile.filename : null;

        try {
            // Знайдемо курс за ID
            const course = await Course.findById(_id);

            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }

            // Оновлюємо курс
            course.title = title;
            course.description = description;
            course.video_link = videoLink;
            course.article = article;
            course.img = imgPath || course.img; // Якщо є нове зображення, оновлюємо
            course.files = filesPath || course.files; // Якщо є нові файли, оновлюємо
            course.publish = publish !== undefined ? publish : course.publish;

            // Зберігаємо оновлений курс
            await course.save();

            res.status(200).json({ message: 'Course updated successfully' });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Failed to update course' });
        }
    });
};





exports.deleteCourse = async (req, res) => {
    const { id } = req.params;

    try {
        // Знаходимо курс за ID
        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const { img, files } = course;

        // Видаляємо курс з бази
        await Course.findByIdAndDelete(id);

        // Видаляємо картинку, якщо є
        if (img) {
            const imgPath = path.join(__dirname, '../public/img/courses', img);

            if (fs.existsSync(imgPath)) {
                fs.unlink(imgPath, (err) => {
                    if (err) {
                        console.error(`Failed to delete image: ${imgPath}`, err.message);
                    }
                });
            } else {
                console.warn(`Image file not found: ${imgPath}`);
            }
        }

        // Видаляємо файли, якщо є
        if (files) {
            const filePaths = files.split(',').map(file => path.join(__dirname, '../public/files', file));
            filePaths.forEach(filePath => {
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error(`Failed to delete file: ${filePath}`, err.message);
                        }
                    });
                } else {
                    console.warn(`File not found: ${filePath}`);
                }
            });
        }

        res.status(200).json({ message: 'Course deleted successfully along with associated files' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to delete course' });
    }
};





exports.createCourse = async (req, res) => {
    try {
        await uploadFiles(req, res); // Очікуємо завантаження файлів

        const { title, description = '', videoLink, article = '', createdBy, publish } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const imgFile = req.files?.img ? req.files.img[0] : null;
        const fileNames = req.files?.files ? req.files.files.map(item => item.filename) : [];

        let imgPathFinal = null;

        // Перевірка ширини зображення
        if (imgFile) {
            try {
                const metadata = await sharp(imgFile.path).metadata();
                if (metadata.width < 850) {
                    fs.unlinkSync(imgFile.path); // Видаляємо некоректне зображення
                    return res.status(400).json({ error: 'The image width must be at least 850px' });
                }
                imgPathFinal = imgFile.filename;
            } catch (error) {
                console.error('Failed to validate image dimensions:', error.message);
                return res.status(500).json({ error: 'Image validation failed' });
            }
        }

        const newCourse = new Course({
            title,
            description,
            article,
            video_link: videoLink || null,
            img: imgPathFinal,
            files: fileNames.length > 0 ? fileNames.join(',') : '', // Тепер масив файлів, а не рядок
            created_by: createdBy,
            publish
        });

        const savedCourse = await newCourse.save();
        res.status(201).json({ id: savedCourse._id, message: 'Course added successfully' });
    } catch (error) {
        console.error('Error in createCourse:', error);
        res.status(500).json({ error: 'Failed to add course' });
    }
};






// Отримати всі курси
exports.getCourses = async (req, res) => {
    try {
        // Знайдемо всі курси
        const courses = await Course.find();

        // Якщо курси не знайдені
        if (!courses.length) {
            return res.status(404).json({ error: 'No courses found' });
        }

        res.status(200).json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};


// Отримання курсу за ID
exports.getCourseById = async (req, res) => {
    const { id } = req.params;

    try {
        // Знаходимо курс за ID
        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.status(200).json(course);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
};



exports.getTeacherCourses = async (req, res) => {
    const { id } = req.params;

    try {
        // Знайти курси, де "created_by" дорівнює "id"
        const courses = await Course.find({ created_by: id });

        if (courses.length === 0) {
            return res.status(404).json({ error: 'No courses found for this teacher' });
        }

        res.status(200).json(courses);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to fetch courses' });
    }
};