import { BadgeCheck, Building2, CircleCheck, Hourglass, Plus, Search, TrendingUp, UsersRound } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

const UserManagementList = () => {
   
  const DATA = [
    {
      label:'TOTAL USERS',
       count: '2,482',
        detail: '+12% ',
        detailIcon:<TrendingUp className='w-4 h-4 text-[#16A34A]'/>,
        detailColor:'text-[#16A34A]',
        icon: <UsersRound className="w-5 h-5 text-[#084E92]" />,
        color: 'text-[#084E92]',
        iconBg: 'bg-[#084E921A]/50',
    },
    {
      label:'KYC VERIFIED',
       count: '2,333',
        detail: '94% ',
        detailIcon:<CircleCheck className='w-4 h-4 text-[#16A34A]'/>,
        detailColor:'text-[#16A34A]',
        icon: <BadgeCheck className="w-5 h-5 text-[#084E92]" />,
        color: 'text-[#084E92]',
        iconBg: 'bg-[#084E921A]/50',
    },
    {
      label:'PENDING REVIEW',
       count: '124',
        detail: `48 Pending`,
        detailColor:'text-[#CA8A04]',
        icon: <Hourglass className="w-5 h-5 text-[#084E92]" />,
        color: 'text-[#084E92]',
        iconBg: 'bg-[#084E921A]/50',
    },
    {
      label:'ACTIVE ORGANIZATIONS',
       count: '12',
        detail: `Across 42 Outlets`,
        detailColor:'text-[#43474F]',
        icon: <Building2 className="w-5 h-5 text-[#084E92]" />,
        color: 'text-[#084E92]',
        iconBg: 'bg-[#084E921A]/50',
    }
  ]

  return (
    <container>
      <div className='w-full md:w-[90%]'>
        <div className='w-full  flex justify-between mx-6'>
            <div>
              <h1 className='text-[#084E92] text-2xl md:text-4xl font-bold'>User Management List</h1>
              <p className='pt-2'>Manage enterprise-wide user access, organizational roles, and compliance verification status from a centralized console.</p>
            </div>

            <Link to="/users/add-new-user" className='flex gap-3 bg-[#084E92] justify-center items-center h-max p-4 rounded text-white text-xs'><Plus size={15}/> Add New User</Link>
      </div>

      <div className='mx-6 flex gap-5 mt-12 bg-white justify-between w-full'>
        {
          DATA.map((item) => (
              <div className='w-[50%] md:w-[25%] border border-[#C3C6D1] rounded-2xl p-6'>
              <div className='flex justify-between'>
                <span className={`bg-[#084E921A]/50 p-2 w-max rounded flex items-center justify-center`}>{item.icon}</span>
                <span className={`flex gap-1 items-center justify-center text-xs self-start ${item.detailColor} font-bold`}>{item.detail} {item.detailIcon}</span>
              </div>
              <div className='mt-2'>
                <h3 className='text-xs text-[#737781]'>{item.label}</h3>
                <p className={`${item.color} font-bold`}>{item.count}</p>
              </div>
            </div>
          ))
        }
      </div>

      <div className='w-full rounded-2xl px-2 mt-6 border border-gray-500 mx-6'>
          <div className='py-5 px-2 flex justify-between gap-1'>
            <div className='py-1 px-3 bg-[#F3F4F580] w-full flex gap-1 items-center rounded-xl border border-[#C3C5D780]'>
              <Search size={15}/>
                  <input type="text" placeholder='Search by company name or code...' className='w-full outline-none text-sm p-1'/>           
            </div>
            <div className='py-2 px-4 bg-[#F3F4F580] rounded-xl border border-[#C3C5D780] '>
              <select name="" id="" className='text-xs '>
              <option value="All Status" >All Status</option>
            </select>
            </div>
          </div>
      </div>  
      </div>
    </container>
  )
}

export default UserManagementList
