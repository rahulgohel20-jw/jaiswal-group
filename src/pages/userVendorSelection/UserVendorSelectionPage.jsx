import { ArrowRight, CircleAlert, HeartHandshake, Save, User } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router';
import { Container } from "@/components/common/container";

const UserVendorSelectionPage = () => {

    const selectionData = [
        {
            icon: User,
            iconColor:'text-[#084E92]',
            title:'User Registration',
            desc:'Register employees, staff members, managers and administrators within the organization hierarchy.',
            btnTitle: 'Continue as User',
            btnColor:'bg-[#084E92]',
            textColor: 'text-[#FFFFFF]',
            border:'border-[#084E92]',
            path:'/users/add-user'
        },
        {
            icon: HeartHandshake,
            iconColor:'text-[#565F69]',
            title:'Vendor Registration',
            desc:'Register suppliers, agencies, contractors and external vendors who partner with the enterprise.',
            btnTitle: 'Continue as Vendor',
            btnColor:'bg-[#F9F9FF]',
            textColor: 'text-[#084E92]',
             border:'border-[#084E92]',
             path:'/vendors/add-vendor'
        }
    ]
  return (
  <Container>
      <div className='w-full'>
      <div className='w-full flex items-center justify-center gap-10 flex-col'>
        <div className='md:w-[50%] w-full text-center px-3'>
            <h1 className='text-2xl md:text-3xl font-bold text-[#084E92]'>Register New Member</h1>
        <p className='py-4 text-[#43474F]'>Select how you want to register the member. Each path offers a specialized
onboarding workflow designed for different roles.</p>
      </div>

      <div className='grid grid-col-1 md:grid-cols-2 w-full px-6 gap-5'>
        {
            selectionData.map((item) => (
                <div className='border border-[#C3C6D1] bg-[#FFFFFF] rounded-2xl flex flex-col items-center gap-5 p-8 text-center'>
                    <span className={`p-6 rounded-full bg-[#E1E8FD] ${item.iconColor}`}><item.icon size={40} /></span>
                    <h1 className='text-[#084E92] font-semibold text-2xl'>{item.title}</h1>
                    <p className='text-[#43474F] px-6'>{item.desc}</p>
                    <Link
                                to={item.path}
                                className={`${item.btnColor} w-full py-2 rounded ${item.textColor} border border-[#084E92] flex gap-2 items-center justify-center text-sm`}
                              >
                             {item.btnTitle} <ArrowRight size={15}/>
                    </Link>
                </div>
            ))
        }
      </div>

         <p className='flex gap-2 items-center text-xs text-[#43474F99]'><CircleAlert size={15}/> You can change registration types or cancel this process at any stage.</p>
         <div className="py-4 w-full border-t border-[#C3C6D1] mx-6 px-6 flex justify-end gap-5 text-sm">
            <button className='py-2 px-6 border border-[#737781] text-[#43474F] rounded'>Cancle</button>
            <button className='py-2 px-6 flex gap-2 items-center bg-[#084E92] text-white rounded'><Save size={15}/> Save</button>
         </div>
        </div>
    </div>
  </Container>
  )
}

export default UserVendorSelectionPage
