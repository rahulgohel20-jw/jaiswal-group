import { ChevronRight } from 'lucide-react'
import React from 'react'
import { Container } from "@/components/common/container";

const RowMaterialUnit = () => {
  return (
    <Container>
      <div className='p-4 md:p-6'>
            {/* Breadcrumb */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                            <span>Dashboard</span>
                            <ChevronRight size={12} />
                            <span>Master Data</span>
                            <ChevronRight size={12} />
                            <span className="text-[#084E92] font-medium">Raw Material Unit Master</span>
                        </div>
      </div>
    </Container>
  )
}

export default RowMaterialUnit
