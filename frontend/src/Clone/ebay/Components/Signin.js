const Signin = () => {
  return (
    <div class="p-4">
      <div class="bg-gray-100 rounded-md overflow-hidden border-gray-600 border-solid border-[1px] relative max-h-[40px]">
        <input
          class="peer rounded-md w-full pt-2 pl-2 pr-2 bg-gray-100 focus:bg-white focus:border-black focus:outline-none focus:border-solid focus:border-[1px] duration-150 text-[0.9rem]"
          placeeholder=" "
          type="text"
          id="emailusername"
          name="emailusername"
        />
        <label
          class="absolute top-[5px] left-[10px] text-gray-500 duration-300 ease-in-out peer-focus:text-[0.7rem] peer-focus:top-0 peer-focus:font-bold peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500"
          for="emailusername"
        >
          Email or username
        </label>
      </div>
    </div>
  );
};
export default Signin;
