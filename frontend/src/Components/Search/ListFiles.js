import { MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { MdOutlineKeyboardDoubleArrowRight } from "react-icons/md";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { MdOutlineCloudDownload } from "react-icons/md";

const foundFiles = "0 Files";
const EmptyFiles = () => {
  return (
    <div className="w-full flex items-center justify-center rounded-md">
      <p className="text-gray-500">No files found</p>
    </div>
  );
};
const NextPage = () => {
  return (
    <div className="flex items-center justify-between mt-5">
      <div>
        <span className="group cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1 duration-100 flex items-center gap-x-2">
          <MdKeyboardDoubleArrowLeft className="text-[1.2rem] transform group-hover:-translate-x-1" />
          <span className="text-[0.9rem]">Previous</span>
        </span>
      </div>
      <div>
        <span className="group cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1 duration-100 flex items-center gap-x-2">
          <span className="text-[0.9rem]">Next</span>
          <MdOutlineKeyboardDoubleArrowRight className="text-[1.2rem] transform group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};
const RecordFiles = () => {
  return (
    <div className="flex flex-col gap-y-2">
      {/* Row start */}
      <div className="border-solid shadow-sm border-[0.5px] border-gray-500 p-2 rounded-md bg-gray-50">
        <div className="flex justify-between items-center text-[0.9rem] text-gray-500 px-4">
          <div className="w-full">
            <span className="">Filename.pdf</span>
          </div>
          <div className="w-1/2 flex justify-between items-center gap-x-3">
            <div>
              <span className=" group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineRemoveRedEye className="text-[1.2rem] transform group-hover:rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]"> Preview</span>
              </span>
            </div>
            <div>
              <span className="group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineCloudDownload className="text-[1.2rem] transform group-hover:-rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]">Download</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row - End */}
      {/* Row start */}
      <div className="border-solid shadow-sm border-[0.5px] border-gray-500 p-2 rounded-md bg-gray-50">
        <div className="flex justify-between items-center text-[0.9rem] text-gray-500 px-4">
          <div className="w-full">
            <span className="">Filename.pdf</span>
          </div>
          <div className="w-1/2 flex justify-between items-center gap-x-3">
            <div>
              <span className=" group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineRemoveRedEye className="text-[1.2rem] transform group-hover:rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]"> Preview</span>
              </span>
            </div>
            <div>
              <span className="group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineCloudDownload className="text-[1.2rem] transform group-hover:-rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]">Download</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row - End */}
      {/* Row start */}
      <div className="border-solid shadow-sm border-[0.5px] border-gray-500 p-2 rounded-md bg-gray-50">
        <div className="flex justify-between items-center text-[0.9rem] text-gray-500 px-4">
          <div className="w-full">
            <span className="">Filename.pdf</span>
          </div>
          <div className="w-1/2 flex justify-between items-center gap-x-3">
            <div>
              <span className=" group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineRemoveRedEye className="text-[1.2rem] transform group-hover:rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]"> Preview</span>
              </span>
            </div>
            <div>
              <span className="group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineCloudDownload className="text-[1.2rem] transform group-hover:-rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]">Download</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row - End */}
      {/* Row start */}
      <div className="border-solid shadow-sm border-[0.5px] border-gray-500 p-2 rounded-md bg-gray-50">
        <div className="flex justify-between items-center text-[0.9rem] text-gray-500 px-4">
          <div className="w-full">
            <span className="">Filename.pdf</span>
          </div>
          <div className="w-1/2 flex justify-between items-center gap-x-3">
            <div>
              <span className=" group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineRemoveRedEye className="text-[1.2rem] transform group-hover:rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]"> Preview</span>
              </span>
            </div>
            <div>
              <span className="group flex items-center gap-x-2 cursor-pointer text-gray-500 hover:text-gray-800 rounded-md px-2 py-1">
                <MdOutlineCloudDownload className="text-[1.2rem] transform group-hover:-rotate-12 duration-300 group-hover:text-[1.3rem]" />
                <span className="text-[0.9rem]">Download</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row - End */}
    </div>
  );
};
const ListFiles = () => {
  return (
    <div className="mt-7">
      <div className="flex items-center justify-between px-2">
        <p className="text-[1rem]">Result files</p>
        <p className="text-[1rem] text-gray-500">{foundFiles}</p>
      </div>
      <div className="mt-5 p-7 bg-gray-100 shadow-sm rounded-md">
        {/* <EmptyFiles /> */}
        <RecordFiles />
        <NextPage />
      </div>
    </div>
  );
};
export default ListFiles;
