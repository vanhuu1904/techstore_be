import mongoose from "mongoose";
import dotenv from "dotenv";
import product from "../models/product.js";
import products from "./data.js";
dotenv.config({ path: "backend/config/config.env" });
const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.DB_LOCAL_URI);
    await product.deleteMany();
    console.log("Products are deleted");

    await product.insertMany(products);
    console.log("Products are added");
    process.exit();
  } catch (error) {
    console.log(error.message);
    process.exit();
  }
};

seedProducts();
