import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContactSalesModal from '../components/ContactSalesModal';

const ContactSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);

  const handleCloseModal = () => {
    setShowModal(false);
    navigate(-1); // Go back to previous page
  };

  return (
    <>
      {showModal && <ContactSalesModal onClose={handleCloseModal} />}
    </>
  );
};

export default ContactSalesPage;
