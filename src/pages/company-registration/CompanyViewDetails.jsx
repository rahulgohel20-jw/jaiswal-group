import React from "react";
import { useLocation, useNavigate } from "react-router";
import {
    ArrowLeft,
    SquarePen,
    Building2,
    MapPin,
    Calendar,
    BadgeCheck,
    Landmark,
    CreditCard,
    Phone,
    Mail,
} from "lucide-react";


const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">

            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#084E92]" />
            </div>

            <h2 className="font-bold text-gray-800">
                {title}
            </h2>

        </div>

        <div className="px-6 py-4">
            {children}
        </div>

    </div>
);


const InfoCard = ({ label, value }) => (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">

        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
            {label}
        </p>

        <p className="text-sm font-semibold text-gray-800 mt-1">
            {typeof value === "object"
                ? value?.msg
                : value || "—"}
        </p>

    </div>
);


const StatCard = ({ label, value, icon: Icon }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">

        <div className="flex items-center justify-between">

            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                {label}
            </p>

            <div className="w-9 h-9 rounded-xl bg-[#084E92]/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#084E92]" />
            </div>

        </div>


        <p className="mt-3 text-sm font-semibold text-gray-800">
            {value || "—"}
        </p>

    </div>
);



const CompanyViewDetails = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const company = location.state?.company;


    if (!company) {
        navigate("/companies");
        return null;
    }


    return (

        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">


            {/* Header */}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">


                <div>

                    <button
                        onClick={() => navigate("/companies")}
                        className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Companies
                    </button>


                    <h1 className="text-3xl md:text-4xl font-bold text-[#084E92]">
                        {company.companyNameEnglish}
                    </h1>


                    <p className="text-[#737781] mt-1">
                        Complete company profile and registration information.
                    </p>


                </div>



                <button
                    onClick={() =>
                        navigate("/companies/update-company", {
                            state: {
                                company
                            }
                        })
                    }
                    className="bg-[#084E92] text-white px-5 py-3 rounded-xl flex items-center gap-2"
                >

                    <SquarePen className="w-4 h-4" />

                    Edit Company

                </button>


            </div>



            {/* Company Profile Card */}

            <div className="mt-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">


                <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center">

                    <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center shrink-0">
                        {company.companyLogo ? (
                            <img
                                src={company.companyLogo}
                                alt={company.companyNameEnglish}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        ) : (
                            <Building2 className="w-12 h-12 text-[#084E92]" />
                        )}
                    </div>
                </div>



                <div className="text-center sm:text-left">

                    <h2 className="text-2xl font-bold text-gray-900">
                        {company.companyNameEnglish}
                    </h2>


                    <p className="text-gray-500 mt-1">
                        {company.companyCode}
                    </p>


                    <p className="text-[#084E92] text-sm mt-2">
                        {company.emailid}
                    </p>



                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">


                        <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full">
                            {company.shortCode}
                        </span>


                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${company.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                            }`}>
                            {company.isActive ? "Active" : "Inactive"}
                        </span>


                    </div>


                </div>


            </div>




            {/* Stats */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">


                <StatCard
                    label="Company Code"
                    value={company.companyCode}
                    icon={Building2}
                />


                <StatCard
                    label="Location"
                    value={company.cityName}
                    icon={MapPin}
                />


                <StatCard
                    label="Created On"
                    value={company.createdAt}
                    icon={Calendar}
                />


                <StatCard
                    label="Verification"
                    value={company.isverified ? "Verified" : "Pending"}
                    icon={BadgeCheck}
                />


            </div>





            <SectionCard
                title="Company Information"
                icon={Building2}
            >

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                    <InfoCard
                        label="Company Name"
                        value={company.companyNameEnglish}
                    />


                    <InfoCard
                        label="Company Code"
                        value={company.companyCode}
                    />


                    <InfoCard
                        label="Short Code"
                        value={company.shortCode}
                    />


                    <InfoCard
                        label="Parent Company"
                        value={company.parentName}
                    />


                    <InfoCard
                        label="Email"
                        value={company.emailid}
                    />


                    <InfoCard
                        label="Mobile Number"
                        value={company.mobilenumber}
                    />


                </div>

            </SectionCard>






            <SectionCard
                title="Address Information"
                icon={MapPin}
            >

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                    <InfoCard
                        label="Address Line 1"
                        value={company.addressEnglish}
                    />


                    <InfoCard
                        label="Address Line 2"
                        value={company.addressline2}
                    />


                    <InfoCard
                        label="City"
                        value={company.cityName}
                    />


                    <InfoCard
                        label="State"
                        value={company.stateName}
                    />


                    <InfoCard
                        label="Country"
                        value={company.countryName}
                    />


                    <InfoCard
                        label="Pincode"
                        value={company.pincode}
                    />


                </div>


            </SectionCard>






            <SectionCard
                title="Tax & Bank Information"
                icon={Landmark}
            >

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                    <InfoCard
                        label="GST Number"
                        value={company.gstNumber}
                    />


                    <InfoCard
                        label="PAN Number"
                        value={company.panNumber}
                    />


                    <InfoCard
                        label="Account Holder"
                        value={company.accountholdername}
                    />


                    <InfoCard
                        label="Bank Name"
                        value={company.bankname}
                    />


                    <InfoCard
                        label="Account Number"
                        value={company.accountnumber}
                    />


                    <InfoCard
                        label="IFSC Code"
                        value={company.bankifsccode}
                    />


                    <InfoCard
                        label="Branch"
                        value={company.branchname}
                    />


                </div>


            </SectionCard>



        </div>

    );

};


export default CompanyViewDetails;