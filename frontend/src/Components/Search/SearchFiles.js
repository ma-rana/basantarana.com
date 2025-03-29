import ListFiles from "./ListFiles";
import { MdOutlineSearch } from "react-icons/md";

const SearchBtn =
  "px-2 rounded-md duration-300 transform group-hover:translate-x-6 ease-in-out group-hover:font-bold";
const SearchInp = "outline-none bg-transparent w-full pl-1 pr-2";
// after:absolute after:w-[2px] after:top-0 after:rounded-full after:right-0 after:bottom-0 after:content-[''] after:bg-black
// before:absolute before:w-[2px] before:top-0 before:rounded-full before:left-0 before:bottom-0 before:content-[''] before:bg-black
const SearchFiles = () => {
  return (
    <div>
      <div className="mx-auto mt-10 max-w-[700px]">
        {/* Top section - First section (Search input) */}
        <div>
          <p className="cursor-default">Search files</p>
          <div className="flex shadow-sm mt-5 justify-between p-1 rounded-md items-center border-solid border-gray-600 border-[0.5px] bg-gray-100">
            <div className="relative w-full">
              <div className="after: after:absolute after:w-[1.5px] after:top-[2px] after:bottom-[2px] after:right-0 after:rounded-full after:content[''] after:bg-black">
                <input type="text" className={SearchInp} />
              </div>
            </div>
            <div className="w-[150px]">
              <span className="group flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-800 ">
                <span type="submit" className={SearchBtn}>
                  Search
                </span>
                <MdOutlineSearch className="text-[1.4rem] hover:text-gray-800 duration-500 transform group-hover:-translate-x-[65px] transition-transform group-hover:rotate-90" />
              </span>
            </div>
          </div>
        </div>

        {/* Second section - List files (Records lists) */}
        <ListFiles />
      </div>
    </div>
  );
};
export default SearchFiles;
