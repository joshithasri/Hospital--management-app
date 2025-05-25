import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { generateToken } from "../utils/jwtToken.js";
import cloudinary from "cloudinary";

export const patientRegister = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
  } = req.body;

  if ([firstName, lastName, email, phone, nic, dob, gender, password].includes(undefined)) {
    return next(new ErrorHandler("All Fields Are Required!", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("Account Already Exists With This Email!", 400));
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: "Patient",
  });

  generateToken(newUser, "Patient Registered Successfully!", 200, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, confirmPassword, role } = req.body;

  if (!email || !password || !confirmPassword || !role) {
    return next(new ErrorHandler("Complete All Required Fields!", 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords Do Not Match!", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new ErrorHandler("Invalid Credentials Provided!", 400));
  }

  if (user.role !== role) {
    return next(new ErrorHandler("Role Mismatch. Please Check!", 400));
  }

  generateToken(user, "Logged In Successfully!", 201, res);
});

export const addNewAdmin = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
  } = req.body;

  const required = [firstName, lastName, email, phone, nic, dob, gender, password];
  if (required.some(field => !field)) {
    return next(new ErrorHandler("Please Provide All Fields!", 400));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ErrorHandler("An Admin With This Email Exists!", 400));
  }

  const admin = await User.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: "Admin",
  });

  res.status(200).json({
    success: true,
    message: "Admin Account Created",
    admin,
  });
});

export const addNewDoctor = catchAsyncErrors(async (req, res, next) => {
  const { files } = req;
  if (!files || !files.docAvatar) {
    return next(new ErrorHandler("Doctor Profile Image Is Required!", 400));
  }

  const { docAvatar } = files;
  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!supportedTypes.includes(docAvatar.mimetype)) {
    return next(new ErrorHandler("Unsupported Image Format!", 400));
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    doctorDepartment,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !nic ||
    !dob ||
    !gender ||
    !password ||
    !doctorDepartment
  ) {
    return next(new ErrorHandler("Please Complete The Form!", 400));
  }

  const duplicate = await User.findOne({ email });
  if (duplicate) {
    return next(new ErrorHandler("Doctor Already Registered With This Email!", 400));
  }

  const uploadResult = await cloudinary.uploader.upload(docAvatar.tempFilePath);
  if (!uploadResult || uploadResult.error) {
    console.error("Upload Error:", uploadResult.error || "Unknown error during upload.");
    return next(new ErrorHandler("Unable To Upload Image!", 500));
  }

  const newDoctor = await User.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: "Doctor",
    doctorDepartment,
    docAvatar: {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    },
  });

  res.status(200).json({
    success: true,
    message: "Doctor Account Created",
    doctor: newDoctor,
  });
});

export const getAllDoctors = catchAsyncErrors(async (req, res, next) => {
  const doctors = await User.find({ role: "Doctor" });
  res.status(200).json({
    success: true,
    doctors,
  });
});

export const getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const { user } = req;
  res.status(200).json({
    success: true,
    user,
  });
});

export const logoutAdmin = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("adminToken", "", {
      httpOnly: true,
      expires: new Date(0),
    })
    .json({
      success: true,
      message: "Admin Logged Out!",
    });
});

export const logoutPatient = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("patientToken", "", {
      httpOnly: true,
      expires: new Date(0),
    })
    .json({
      success: true,
      message: "Patient Logout Successful!",
    });
});
