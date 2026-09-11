const { protect } = require('../middlewares/authMiddleware');
const { notFound, errorHandler } = require('../middlewares/errorMiddleware');
const upload = require('../middlewares/uploadMiddleware');

module.exports = {
  protect,
  notFound,
  errorHandler,
  upload
};
