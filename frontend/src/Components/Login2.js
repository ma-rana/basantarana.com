import React from "react";
import { FaRegUserCircle } from "react-icons/fa";

const Login2 = () => {
  const formDivSty =
    "my-3 flex items-center bg-white rounded-md px-2 shadow-sm group";
  const labelSty = "pr-1 text-[1.2rem]";
  const inpSty =
    "outline-none px-2 py-1 text-[1rem] w-full group-hover:border-black focus:ring-1 focus:ring-black";
  return (
    <div>
      <div className="shadow-sm bg-gray-100 rounded-md p-5 max-sm:min-w-11/12 w-10/12 my-5 mx-auto">
        <form>
          <div className={formDivSty}>
            <label for="email" className={labelSty}>
              <FaRegUserCircle />
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className={inpSty}
              placeholder="Email address"
            />
          </div>
          <div className={formDivSty}>
            <label for="password" className={labelSty}>
              <FaRegUserCircle />
            </label>
            <input
              type="password"
              name="password"
              id="password"
              className={inpSty}
              placeholder="Password"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
export default Login2;
