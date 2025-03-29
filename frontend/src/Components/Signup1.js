import React from "react";
import { FaGoogle, FaFacebookF } from "react-icons/fa";

const Signup1 = () => {
  const iconStyle =
    "text-[1rem] text-white group-hover:text-[1.2rem] max-sm:text-[0.9rem] max-sm:group-hover:text-[1.1rem] duration-100";
  const formDivStyle = "flex gap-x-2 items-end mb-3";
  const labelStyle =
    "min-w-[150px] max-sm:min-w-[70px] text-[1.1rem] max-sm:text-[0.9rem] text-gray-600";
  const inputStyle =
    " w-full py-1 px-3 outline-none border-b-solid border-b-[1.5px] border-b-gray-400 hover:border-b-blue-400 duration-100 focus:border-b-blue-500 mb-1 text-[1rem] max-sm:rounded-none max-sm:text-[0.9rem] appearance-none";
  return (
    <div className="pt-5">
      <div className="max-sm:w-10/12 max-md:w-10/12 max-lg:w-10/12 w-1/2 bg-white p-10 max-sm:p-5 rounded-md shadow-sm my-10 mx-auto">
        <div className="mb-10 max-sm:mb-5 text-center">
          <span className="title text-[1.6rem] max-sm:text-[1.2rem] text-gray-700 ">
            Create an new account
          </span>
          <div className="mt-2 max-sm:mt-1">
            <span className=" text-gray-500 text-[0.9rem] max-sm:text-[0.7rem]">
              Fill out the form to get started.
            </span>
          </div>
        </div>
        <form className="px-2 max-sm:px-1">
          <div className={formDivStyle}>
            <label for="name" className={labelStyle}>
              Name
            </label>
            <input
              type="text"
              id="name"
              placeholder="Enter your full name"
              className={inputStyle}
              required
            />
          </div>
          <div className={formDivStyle}>
            <label for="email" className={labelStyle}>
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              className={inputStyle}
              required
            />
          </div>
          <div className={formDivStyle}>
            <label for="number" className={labelStyle}>
              Number
            </label>
            <div className="flex gap-x-2 w-full">
              <input
                type="number"
                id="code"
                placeholder="code"
                className="w-1/5 py-1 px-3 outline-none border-b-solid border-b-[1.5px] border-b-gray-400 hover:border-b-blue-400 duration-100 focus:border-b-blue-500 mb-1 text-[1rem] max-sm:rounded-none max-sm:text-[0.9rem] appearance-none"
                required
              />
              <input
                type="number"
                id="number"
                placeholder="Enter your number"
                className={inputStyle}
                required
              />
            </div>
          </div>
          <div className={formDivStyle}>
            <label for="address" className={labelStyle}>
              Address
            </label>
            <div className="flex gap-x-2 w-full">
              <input
                type="state"
                id="address"
                placeholder="State"
                className="w-1/4 py-1 px-3 outline-none border-b-solid border-b-[1.5px] border-b-gray-400 hover:border-b-blue-400 duration-100 focus:border-b-blue-500 mb-1 text-[1rem] max-sm:rounded-none max-sm:text-[0.9rem] appearance-none"
                required
              />
              <input
                type="text"
                id="address"
                placeholder="Address"
                className={inputStyle}
                required
              />
              <input
                type="number"
                id="address"
                placeholder="Postal Code"
                className="w-1/2 py-1 px-3 outline-none border-b-solid border-b-[1.5px] border-b-gray-400 hover:border-b-blue-400 duration-100 focus:border-b-blue-500 mb-1 text-[1rem] max-sm:rounded-none max-sm:text-[0.9rem] appearance-none"
                required
              />
            </div>
          </div>
          <div className={formDivStyle}>
            <label for="password" className={labelStyle}>
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              className={inputStyle}
              required
            />
          </div>
          <div className={formDivStyle}>
            <label for="confirm" className={labelStyle}>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm"
              placeholder="Confirm your password"
              className={inputStyle}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="max-sm:min-w-[110px] max-sm:text-[0.9rem] min-w-[150px] bg-green-500 text-white p-2 rounded-sm text-[1.1rem] font-bold hover:bg-green-600 mt-3 duration-100"
            >
              Signup
            </button>
          </div>
          <div className="text-center mt-8 max-sm:mt-5">
            <span className="max-sm:text-[0.8rem] text-[1rem] text-gray-500">
              Already have an account?{" "}
              <button className="text-blue-500">Login here!</button>
            </span>
          </div>
          <div className="my-3 text-center">
            <span className=" max-sm:before:h-[0.5px] max-sm:after:h-[0.5px] max-sm:before:w-[100px] max-sm:after:w-[100px] max-sm:before:left-[-60px] max-sm:after:left-[80px] content:none text-gray-500 before:absolute before:top-1/2 before:left-[-120px] before:w-[200px] before:h-[1px] before:bg-gray-500 relative before:-translate-x-1/2 before:-translate-y-1/2 after:absolute after:top-1/2 after:left-[135px] after:w-[200px] after:h-[1px] after:bg-gray-500 after:-translate-x-1/2 after:-translate-y-1/2 max-sm:text-[0.8rem]">
              OR
            </span>
          </div>
          <div className="text-center">
            <span className="text-[1rem] max-sm:text-[0.9rem] text-gray-500">
              Login or signup with
            </span>
            <div className="flex gap-x-3 items-center justify-center my-5">
              <div className="cursor-pointer rounded-full group flex gap-x-3 items-center bg-red-400 text-white py-2 px-5 hover:bg-red-500 duration-100 ">
                <span className="text-[0.9rem] max-sm:text-[0.8rem]">
                  Google
                </span>
                <FaGoogle className={iconStyle} />
              </div>
              <div className="cursor-pointer rounded-full group flex gap-x-3 items-center bg-blue-400 text-white py-2 px-5 hover:bg-blue-500 hover:text-[1.4rem] duration-100">
                <span className="text-[0.9rem] max-sm:text-[0.8rem]">
                  Facebook
                </span>
                <FaFacebookF className={iconStyle} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Signup1;
