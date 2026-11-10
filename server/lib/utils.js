import jwt from "jsonwebtoken";

//Function to gen a token for user

export const generateToken = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET);
  return token;
};
