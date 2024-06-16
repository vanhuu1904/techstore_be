import catchAsyncError from "../middlewares/catchAsyncError.js";
import Product from "../models/product.js";
import Order from "../models/order.js";
import APIFilters from "../utils/apiFilters.js";
import { delete_file, upload_file } from "../utils/cloudinary.js";
import ErrorHandler from "../utils/errorHandler.js";
// Get all Products  => /api/v1/products
export const getProducts = catchAsyncError(async (req, res, next) => {
  const resPerPage = 4;
  console.log(">>check data");
  const apiFilters = new APIFilters(Product, req.query).search().filter();

  let products = await apiFilters.query;
  let filteredProductsCount = products.length;
  apiFilters.pagination(resPerPage);
  products = await apiFilters.query.clone();
  await res.status(200).json({
    filteredProductsCount,
    products,
    resPerPage,
  });
});

// Create new Product   => /api/v1/admin/products
export const newProduct = catchAsyncError(async (req, res) => {
  req.body.user = req.user._id;
  const product = await Product.create(req.body);

  res.status(200).json({
    product,
  });
});

// Get single Product details   => /api/v1/products/:id
export const getProductDetails = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req?.params?.id).populate(
    "reviews.user"
  );
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    product,
  });
});
// Get  Products - ADMIN => /api/v1/admin/products
export const getAdminProducts = catchAsyncError(async (req, res, next) => {
  const products = await Product.find();

  res.status(200).json({
    products,
  });
});
// Update Product details   => /api/v1/admin/products/:id
export const updateProduct = catchAsyncError(async (req, res) => {
  let product = await Product.findById(req?.params?.id);
  if (!product) {
    return res.status(404).json({
      error: "Product not found",
    });
  }
  product = await Product.findByIdAndUpdate(req?.params?.id, req.body, {
    new: true,
  });

  res.status(200).json({
    product,
  });
});
// Delete Product details   => /api/v1/products/:id
export const deleteProduct = catchAsyncError(async (req, res) => {
  let product = await Product.findById(req?.params?.id);
  if (!product) {
    return res.status(404).json({
      error: "Product not found",
    });
  }
  // Delete image associated with product
  for (let i = 0; i < product.images.length; i++) {
    await delete_file(product.images[i].public_id);
  }
  await product.deleteOne();

  res.status(200).json({
    message: "Product deleted",
  });
});

// Create/Update product review  =>  /api/v1/reviews
export const createProductReview = catchAsyncError(async (req, res, next) => {
  const { rating, comment, productId } = req.body;
  const review = {
    user: req?.user?._id,
    rating: Number(rating),
    comment,
  };
  console.log("check review", review);

  const product = await Product.findById(productId);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const isReviewed = product?.reviews?.find(
    (r) => r.user.toString() === req?.user?._id.toString()
  );

  if (isReviewed) {
    product.reviews.forEach((review) => {
      if (review?.user?.toString() === req?.user?._id.toString()) {
        review.comment = comment;
        review.rating = rating;
      }
    });
  } else {
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }
  product.ratings =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.numOfReviews;
  await product.save();

  res.status(200).json({
    success: true,
  });
});

// Get product reviews   =>  /api/v1/reviews
export const getProductReviews = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.query.id).populate("reviews.user");

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    reviews: product.reviews,
  });
});

// Delete Product review  =>  /api/v1/reviews
export const deleteReview = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  product.reviews = product?.reviews?.filter(
    (review) => review._id.toString() !== req?.query?.id?.toString()
  );

  product.numOfReviews = product.reviews.length;
  if (product.numOfReviews === 0) {
    product.ratings = 0;
  } else {
    product.ratings =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.numOfReviews;
  }

  await product.save();

  res.status(200).json({
    success: true,
    product,
  });
});
// Can User Review   => /api/v1can_review
export const canUserReview = catchAsyncError(async (req, res) => {
  const orders = await Order.find({
    user: req.user._id,
    "orderItems.product": req.query.productId,
  });

  if (orders.length === 0) {
    return res.status(200).json({
      canReviewed: false,
    });
  }
  return res.status(200).json({
    canReviewed: true,
  });
});
// Upload product images   => /api/v1/admin/products/:id/upload_images
export const uploadProductImages = catchAsyncError(async (req, res) => {
  let product = await Product.findById(req?.params?.id);
  if (!product) {
    return res.status(404).json({
      error: "Product not found",
    });
  }
  const uploader = async (image) =>
    upload_file(image, "Home/TECHSTORE/products");
  const urls = await Promise.all((req?.body?.images).map(uploader));
  product?.images?.push(...urls);

  await product?.save();
  res.status(200).json({
    product,
  });
});
// Delete product image   => /api/v1/admin/products/:id/delete_image
export const deleteProductImages = catchAsyncError(async (req, res, next) => {
  let product = await Product.findById(req?.params?.id);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  const isDeleted = await delete_file(req.body.imgId);
  if (isDeleted) {
    product.images = product?.images.filter(
      (img) => img.public_id !== req.body.imgId
    );
    await product?.save();
  }

  res.status(200).json({
    product,
  });
});
