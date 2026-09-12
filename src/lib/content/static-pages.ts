/**
 * About, Contact, and FAQ copy is fixed marketing content with no admin UI to edit it —
 * it lives here instead of the ContentPage/FAQ database tables so these pages can never
 * 404 due to missing seed data.
 */

export const ABOUT_CONTENT = {
  title: 'Dr. JC Goodman, ND',
  body: 'Dr. J. Christopher Goodman, ND, is a highly experienced naturopathic doctor and natural health specialist with over 30 years of practice. A Master Herbalist trained in Western, Ayurvedic, and Chinese traditions, he is also a Certified Nutritionist and Certified Health Specialist. Dr. Goodman has studied extensively in botany, nutrition, physical therapy, stress management, and holistic practices such as Reflexology, Iridology, Qi-gong, Tai Chi, and Yoga. He takes a comprehensive approach to wellness, combining multiple natural modalities to create individualized, lasting results for his patients. Throughout his career, Dr. Goodman has collaborated with a wide range of health practitioners and organizations, been featured in national publications, and shared his expertise through television appearances and speaking engagements. Dedicated to promoting natural health, his mission is to empower individuals to achieve optimal well-being through holistic, non-chemical methods.\n\nTogether, the Alternative Wellness Center team is dedicated to providing exceptional service, compassionate care, and holistic wellness solutions tailored to every patient’s needs.',
};

export const CONTACT_CONTENT = {
  title: 'Contact Us',
  intro: 'Have a question about an upcoming seminar or your registration?',
  body: 'Email us at hello@herbalhealthseminars.com and our team will respond within two business days.',
};

export const FAQ_ITEMS = [
  {
    id: 'what-to-expect',
    question: 'What can I expect from the seminar?',
    answer:
      'Our seminars are hands-on educational workshops where you will learn the fundamentals of herbal preparation and traditional wellness practices. We focus on the educational perspective of herbs for foundational health support.',
  },
  {
    id: 'materials-provided',
    question: 'What materials are provided?',
    answer:
      'We provide all necessary herbal materials and preparation tools for the duration of the tour. Participants are encouraged to bring a notebook and a pen to take notes on the traditional methods taught.',
  },
  {
    id: 'who-its-for',
    question: 'Who is the seminar for?',
    answer:
      'The seminar is designed for adults interested in learning traditional herbal preparation methods and foundational wellness practices. It is ideal for those seeking an educational perspective on herbal health.',
  },
  {
    id: 'prerequisites',
    question: 'Are there any prerequisites?',
    answer:
      'No prior experience is required. Our workshops are accessible to beginners and those with some foundational knowledge. We focus on the educational aspects of herbal preparation for all levels.',
  },
  {
    id: 'how-to-register',
    question: 'How do I register for a tour?',
    answer:
      'Registration and booking can be completed through our dedicated registration system. You can find the upcoming city tours and seminar details on our Events page or by contacting us directly.',
  },
] as const;
