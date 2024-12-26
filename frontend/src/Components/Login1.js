import React from "react";
import { FaGoogle, FaFacebookF } from "react-icons/fa";

const Login1 = () => {
  const iconStyle =
    "text-[1rem] text-white group-hover:text-[1.2rem] duration-100";
  const formDivStyle = "flex gap-x-2 items-end mb-3";
  const labelStyle = "min-w-[90px] text-[1.1rem] text-gray-600";
  const inputStyle =
    " w-full py-1 px-3 outline-none border-b-solid border-b-[1.5px] border-b-gray-400 hover:border-b-blue-400 duration-100 focus:border-b-blue-500 mb-1 text-[1rem]";
  return (
    <div className="pt-5">
      <div className="w-1/2 bg-white p-10 rounded-md shadow-sm my-0 mx-auto">
        <div className="mb-10">
          <span className="title text-center text-[1.6rem] text-gray-700 ">
            Login into your account
          </span>
          <div className="mt-2">
            <span className="text-center text-gray-500 text-[0.9rem]">
              Get connected with the system.
            </span>
          </div>
        </div>
        <form className="px-2">
          <div className={formDivStyle}>
            <label className={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={inputStyle}
              required
            />
          </div>
          <div className={formDivStyle}>
            <label className={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className={inputStyle}
              required
            />
          </div>
          <div>
            <span className="text-[1rem] text-gray-500 hover:text-blue-500 cursor-pointer text-right duration-100">
              Forgot password?
            </span>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <input type="checkbox" className="mr-2" name="check" id="check" />
              <label
                for="check"
                className="text-[0.9rem] text-gray-500 cursor-pointer"
              >
                Remember me
              </label>
            </div>
            <button
              type="submit"
              className="min-w-[150px] bg-green-500 text-white p-2 rounded-sm text-[1.1rem] font-bold hover:bg-green-600 mt-2 duration-100"
            >
              Login
            </button>
          </div>
          <div className="text-center mt-8">
            <span className="text-[1rem] text-gray-500">
              Don't have an account?{" "}
              <button className="text-blue-500">Register here!</button>
            </span>
          </div>
          <div className="my-3 text-center">
            <span className=" content:none text-gray-500 before:absolute before:top-1/2 before:left-[-120px] before:w-[200px] before:h-[1px] before:bg-gray-500 relative before:-translate-x-1/2 before:-translate-y-1/2 after:absolute after:top-1/2 after:left-[135px] after:w-[200px] after:h-[1px] after:bg-gray-500 after:-translate-x-1/2 after:-translate-y-1/2">
              OR
            </span>
          </div>
          <div className="text-center">
            <span className="text-[1rem] text-gray-500">
              Login or signup with
            </span>
            <div className="flex gap-x-3 items-center justify-center my-5">
              <div className="cursor-pointer rounded-full group flex gap-x-3 items-center bg-red-400 text-white py-2 px-5 hover:bg-red-500 duration-100">
                <span className="text-[0.9rem]">Google</span>
                <FaGoogle className={iconStyle} />
              </div>
              <div className="cursor-pointer rounded-full group flex gap-x-3 items-center bg-blue-400 text-white py-2 px-5 hover:bg-blue-500 hover:text-[1.4rem] duration-100">
                <span className="text-[0.9rem]">Facebook</span>
                <FaFacebookF className={iconStyle} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Login1;
