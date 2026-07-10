import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const HeroSection = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative mt-10">
      <Card
        className={`
          bg-white  shadow-sm overflow-visible
          transition-all duration-500 ease-in-out
          ${isScrolled ? 'scale-[0.98] opacity-95' : 'scale-100 opacity-100'}
        `}
      >
        <div className="flex items-center justify-between px-10 py-8 relative">
          {/* Left Content */}
          <div className="flex-1 max-w-md z-10">
            <h1 className="text-[2.5rem] font-bold text-gray-900 mb-3 leading-tight">
              Today Task
            </h1>
            <p className="text-gray-600 text-base mb-6 leading-relaxed">
              Check your daily tasks and schedules
            </p>
            <Button className="bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-md shadow-sm font-medium">
              <Calendar className="w-4 h-4 mr-2" />
              Today's schedule
            </Button>
          </div>

          {/* Right Illustration - Heavily overflowing from TOP */}
          <div className="hidden lg:block absolute -right-0 -top-23 z-20">
            <img
              src="/media/images/tm.png"
              alt="Task Management"
              className="w-[300px] h-auto object-contain drop-shadow-1.5xl"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HeroSection;
