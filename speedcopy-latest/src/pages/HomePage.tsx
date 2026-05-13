import React from 'react';
import Navbar from '../components/Navbar';
import MarqueeBanner from '../components/MarqueeBanner';
import HeroSection from '../components/HeroSection';
import CategorySection from '../components/CategorySection';
import PromoBanners from '../components/PromoBanners';
import ReferralBanner from '../components/ReferralBanner';
import StatsSection from '../components/StatsSection';
import TestimonialsSection from '../components/TestimonialsSection';
import Footer from '../components/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f0' }}>
      <Navbar />
      <MarqueeBanner />
      <HeroSection />
      <CategorySection />
      <PromoBanners />
      <ReferralBanner />
      <StatsSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default HomePage;



