import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Printer,
  SquarePen,
  User,
  Users,
  Utensils,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { notify } from '@/utils/toast';
import { getEventById } from '@/services/apiServices';
import { normalizeEvent, SAMPLE_EVENTS } from './eventHelper';
import { StatusBadge } from './StatusBadge';



const InfoCard = ({ label, value, icon: Icon }) => (
  <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 transition hover:bg-gray-50">
    <div className="flex items-center gap-2 text-gray-400 mb-1">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
      <p className="text-[11px] uppercase tracking-wider font-semibold">
        {label}
      </p>
    </div>
    <p className="text-sm font-semibold text-gray-800 break-words">
      {value || '—'}
    </p>
  </div>
);

const StatCard = ({ label, value, icon: Icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600' }) => (
  <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </p>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
    <p className="mt-3 text-xl font-bold text-gray-900 break-words">
      {value || '—'}
    </p>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/40">
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <h2 className="font-bold text-gray-900 text-base">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

export const EventViewDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [event, setEvent] = useState(location.state?.event || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event && id) {
      const fetchDetails = async () => {
        setLoading(true);
        try {
          const res = await getEventById(id);
          const raw = res?.data?.data || res?.data;
          if (raw) {
            setEvent(normalizeEvent(raw));
          } else {
            // Find in sample events as fallback
            const sample = SAMPLE_EVENTS.find((s) => String(s.id) === String(id));
            if (sample) setEvent(normalizeEvent(sample));
          }
        } catch (err) {
          const sample = SAMPLE_EVENTS.find((s) => String(s.id) === String(id));
          if (sample) setEvent(normalizeEvent(sample));
          else notify.error('Failed to load event details.');
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [id, event]);

  if (!event) {
    return (
      <Container>
        <div className="py-12 text-center">
          <p className="text-gray-500">Loading event details...</p>
        </div>
      </Container>
    );
  }

  const balancePayable = Math.max(0, (event.budget || 0) - (event.advanceAmount || 0));

  return (
    <Container>
      <div className="py-6 space-y-6 max-w-5xl mx-auto">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/events')}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-sm"
              title="Back to Events"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {event.eventName}
                </h1>
                <StatusBadge status={event.status} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Code: <span className="font-semibold text-gray-700 font-mono">{event.eventCode}</span> • Type: {event.eventType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print / Export
            </button>
            <button
              onClick={() => navigate(`/events/edit/${event.id}`, { state: { event } })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition"
            >
              <SquarePen className="w-4 h-4" />
              Edit Event
            </button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Expected Pax"
            value={`${event.pax} Guests`}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Event Date"
            value={event.eventStartDate ? event.eventStartDate.split(' ')[0] : 'TBD'}
            icon={Calendar}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatCard
            label="Estimated Budget"
            value={event.budget ? `₹ ${event.budget.toLocaleString('en-IN')}` : '₹ 0'}
            icon={DollarSign}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            label="Advance Paid"
            value={event.advanceAmount ? `₹ ${event.advanceAmount.toLocaleString('en-IN')}` : '₹ 0'}
            icon={DollarSign}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">
          {/* Section 1: Client Details */}
          <SectionCard title="Client / Host Information" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard label="Host / Client Name" value={event.clientName} icon={User} />
              <InfoCard label="Contact Phone" value={event.clientMobile} icon={Phone} />
              <InfoCard label="Email Address" value={event.clientEmail} icon={Mail} />
              <InfoCard label="Company / Entity Name" value={event.originalData?.companyName || 'Individual Host'} />
              <InfoCard label="Assigned Event Manager" value={event.managerName || 'Admin Desk'} />
            </div>
          </SectionCard>

          {/* Section 2: Venue & Timing Logistics */}
          <SectionCard title="Venue & Schedule Logistics" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard label="Venue / Hall Name" value={event.venueName} icon={MapPin} />
              <InfoCard label="Event Start Time" value={event.eventStartDate} icon={Clock} />
              <InfoCard label="Event End Time" value={event.eventEndDate || 'As per conclusion'} icon={Clock} />
              <div className="md:col-span-3">
                <InfoCard label="Venue Full Address" value={event.venueAddress || event.venueName} icon={MapPin} />
              </div>
            </div>
          </SectionCard>

          {/* Section 3: Catering & Food Specifications */}
          <SectionCard title="Catering & Food Specifications" icon={Utensils}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoCard label="Meal Type" value={event.mealType} />
              <InfoCard label="Expected Pax" value={`${event.pax} Guests`} />
              <InfoCard label="Min Guaranteed Pax" value={event.minPax ? `${event.minPax} Guests` : 'Standard'} />
              <InfoCard label="Service Style" value={event.originalData?.serviceStyle || 'Buffet Service'} />
            </div>
          </SectionCard>

          {/* Section 4: Financial Summary */}
          <SectionCard title="Financial Summary & Balance" icon={DollarSign}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard
                label="Total Estimated Amount"
                value={event.budget ? `₹ ${event.budget.toLocaleString('en-IN')}` : '₹ 0'}
              />
              <InfoCard
                label="Advance Payment Received"
                value={event.advanceAmount ? `₹ ${event.advanceAmount.toLocaleString('en-IN')}` : '₹ 0'}
              />
              <InfoCard
                label="Balance Payable"
                value={`₹ ${balancePayable.toLocaleString('en-IN')}`}
              />
            </div>
          </SectionCard>

          {/* Section 5: Special Notes & Instructions */}
          <SectionCard title="Special Requirements & Notes" icon={FileText}>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.remarks || 'No special instructions recorded for this event.'}
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </Container>
  );
};
