import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';

const prisma = new PrismaClient();

async function main() {
  await prisma.homepageContent.upsert({
    where: { id: 'homepage' },
    update: {},
    create: {
      id: 'homepage',
      heroHeading: 'Herbal Health Seminar Series',
      heroSubheading:
        'Practical, evidence-informed education on herbal health — led by experienced instructors, in cities near you.',
      heroCtaLabel: 'View Upcoming Seminars',
      heroCtaHref: '/events',
      missionHeading: 'Education You Can Trust',
      missionBody:
        'We bring accessible, well-researched herbal health education to communities, helping people make informed decisions about natural wellness.',
      finalCtaHeading: 'Ready to Learn More?',
      finalCtaBody: 'Reserve your seat at an upcoming seminar and join thousands of past attendees.',
      finalCtaLabel: 'Register Now',
      finalCtaHref: '/events',
      footerAboutText:
        'Herbal Health Seminar Series hosts educational events on natural wellness across the country.',
      footerContactEmail: 'hello@herbalhealthseminars.com',
      footerContactPhone: null,
    },
  });

  const educationalFocusItems: Array<{ icon: string; title: string; description: string; sortOrder: number }> = [
    {
      icon: 'shield',
      title: 'Botanical Foundations',
      description:
        'Discover the core principles of plant-based medicine, including plant identification and the science of botanical synergy.',
      sortOrder: 1,
    },
    {
      icon: 'heart',
      title: 'Traditional Remedies',
      description:
        'Learn to prepare and use traditional herbal preparations such as tinctures, infusions, and herbal salves for daily wellness.',
      sortOrder: 2,
    },
    {
      icon: 'certificate',
      title: 'Wellness Integration',
      description:
        'Explore how herbal wisdom can be integrated into your daily life to support blood pressure and blood sugar balance.',
      sortOrder: 3,
    },
  ];
  for (const item of educationalFocusItems) {
    const existing = await prisma.educationalFocusItem.findFirst({ where: { title: item.title } });
    if (!existing) await prisma.educationalFocusItem.create({ data: item });
  }

  await prisma.instructor.upsert({
    where: { slug: 'jane-doe' },
    update: {},
    create: {
      slug: 'jane-doe',
      name: 'Dr. Jane Doe',
      credentials: 'ND, Herbal Educator',
      shortBio: 'Naturopathic doctor with 15 years of experience teaching herbal health courses.',
      fullBio:
        'Dr. Jane Doe has spent over a decade educating communities on evidence-informed herbal wellness practices, speaking at seminars nationwide.',
      isFeatured: true,
      sortOrder: 1,
    },
  });

  const faqs: Array<{ question: string; answer: string; sortOrder: number }> = [
    {
      question: 'What can I expect from the seminar?',
      answer:
        'Our seminars are hands-on educational workshops where you will learn the fundamentals of herbal preparation and traditional wellness practices. We focus on the educational perspective of herbs for foundational health support.',
      sortOrder: 1,
    },
    {
      question: 'What materials are provided?',
      answer:
        'We provide all necessary herbal materials and preparation tools for the duration of the tour. Participants are encouraged to bring a notebook and a pen to take notes on the traditional methods taught.',
      sortOrder: 2,
    },
    {
      question: 'Who is the seminar for?',
      answer:
        'The seminar is designed for adults interested in learning traditional herbal preparation methods and foundational wellness practices. It is ideal for those seeking an educational perspective on herbal health.',
      sortOrder: 3,
    },
    {
      question: 'Are there any prerequisites?',
      answer:
        'No prior experience is required. Our workshops are accessible to beginners and those with some foundational knowledge. We focus on the educational aspects of herbal preparation for all levels.',
      sortOrder: 4,
    },
    {
      question: 'How do I register for a tour?',
      answer:
        'Registration and booking can be completed through our dedicated registration system. You can find the upcoming city tours and seminar details on our Events page or by contacting us directly.',
      sortOrder: 5,
    },
  ];
  for (const faq of faqs) {
    const existing = await prisma.fAQ.findFirst({ where: { question: faq.question } });
    if (!existing) await prisma.fAQ.create({ data: faq });
  }

  const contentPages: Array<{
    slug: 'ABOUT' | 'CONTACT' | 'TERMS' | 'PRIVACY' | 'REFUND_POLICY' | 'DISCLAIMER';
    title: string;
    body: string;
  }> = [
    {
      slug: 'ABOUT',
      title: 'Dr. JC Goodman, ND',
      body: 'Dr. J. Christopher Goodman, ND, is a highly experienced naturopathic doctor and natural health specialist with over 30 years of practice. A Master Herbalist trained in Western, Ayurvedic, and Chinese traditions, he is also a Certified Nutritionist and Certified Health Specialist. Dr. Goodman has studied extensively in botany, nutrition, physical therapy, stress management, and holistic practices such as Reflexology, Iridology, Qi-gong, Tai Chi, and Yoga. He takes a comprehensive approach to wellness, combining multiple natural modalities to create individualized, lasting results for his patients. Throughout his career, Dr. Goodman has collaborated with a wide range of health practitioners and organizations, been featured in national publications, and shared his expertise through television appearances and speaking engagements. Dedicated to promoting natural health, his mission is to empower individuals to achieve optimal well-being through holistic, non-chemical methods.\n\nTogether, the Alternative Wellness Center team is dedicated to providing exceptional service, compassionate care, and holistic wellness solutions tailored to every patient’s needs.',
    },
    {
      slug: 'CONTACT',
      title: 'Contact Us',
      body: 'Have a question about an upcoming seminar or your registration?\n\nEmail us at hello@herbalhealthseminars.com and our team will respond within two business days.',
    },
    {
      slug: 'TERMS',
      title: 'Terms of Service',
      body: 'By registering for a seminar, you agree to attend the event in accordance with the schedule and location provided at checkout.\n\nTicket transfers and cancellations are subject to our refund policy.',
    },
    {
      slug: 'PRIVACY',
      title: 'Privacy Policy',
      body: 'We collect only the information needed to process your registration and communicate with you about your seminar.\n\nWe do not collect medical history or health records, and we never sell your personal information.',
    },
    {
      slug: 'REFUND_POLICY',
      title: 'Refund Policy',
      body: 'Refund requests submitted before the event’s refund cutoff date will be processed to the original payment method.\n\nContact us to request a refund or transfer for your registration.',
    },
    {
      slug: 'DISCLAIMER',
      title: 'Educational Disclaimer',
      body: 'The Herbal Health Seminar Series is an educational event series only. Content presented does not constitute medical advice, diagnosis, or treatment.\n\nAlways consult a qualified healthcare provider before making changes to your health regimen.',
    },
  ];
  for (const page of contentPages) {
    await prisma.contentPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('NODE_ENV=production — skipping admin user and sample event seed data.');
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: 'ADMIN',
      isActive: true,
    },
  });

  const editorEmail = process.env.SEED_EDITOR_EMAIL ?? 'editor@example.com';
  const editorPassword = process.env.SEED_EDITOR_PASSWORD ?? 'ChangeMe123!';
  await prisma.adminUser.upsert({
    where: { email: editorEmail },
    update: {},
    create: {
      email: editorEmail,
      passwordHash: await hashPassword(editorPassword),
      role: 'CONTENT_EDITOR',
      isActive: true,
    },
  });

  const location = await prisma.location.upsert({
    where: { id: 'seed-location-portland' },
    update: {},
    create: {
      id: 'seed-location-portland',
      name: 'Portland Community Wellness Center',
      address: '123 SW Main St',
      city: 'Portland',
      state: 'OR',
      postalCode: '97204',
      country: 'US',
    },
  });

  const instructor = await prisma.instructor.findUnique({ where: { slug: 'jane-doe' } });

  const event = await prisma.event.upsert({
    where: { slug: 'herbal-foundations-portland' },
    update: {},
    create: {
      slug: 'herbal-foundations-portland',
      title: 'Herbal Foundations: An Introduction to Natural Wellness',
      seriesName: 'Herbal Health Seminar Series',
      volumeLabel: 'Vol. 1',
      shortDescription: 'A beginner-friendly seminar covering the basics of evidence-informed herbal wellness.',
      longDescription:
        'Join us for a full day of hands-on learning covering herbal preparation methods, safety, and evidence-informed practices, led by experienced instructors.',
      startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      timezone: 'America/Los_Angeles',
      city: location.city,
      state: location.state,
      locationId: location.id,
      coverImageUrl: 'https://placehold.co/1200x630?text=Herbal+Foundations',
      whatYouWillLearn: [
        'Core principles of herbal wellness',
        'Safe preparation and storage methods',
        'How to evaluate evidence-informed sources',
      ],
      materialsIncluded: ['Printed workbook', 'Sample herbal kit'],
      status: 'ON_SALE',
      isFeatured: true,
      sortOrder: 1,
    },
  });

  if (instructor) {
    await prisma.eventInstructor.upsert({
      where: { eventId_instructorId: { eventId: event.id, instructorId: instructor.id } },
      update: {},
      create: { eventId: event.id, instructorId: instructor.id, sortOrder: 1 },
    });
  }

  await prisma.eventTicketType.upsert({
    where: { id: 'seed-ticket-general' },
    update: {},
    create: {
      id: 'seed-ticket-general',
      eventId: event.id,
      name: 'General Admission',
      priceMinorUnits: 4500,
      currency: 'USD',
      capacity: 50,
      sortOrder: 1,
    },
  });

  const galleryImages = [
    { url: 'https://picsum.photos/id/1015/1200/900', caption: 'Botanical garden field trip', sortOrder: 1 },
    { url: 'https://picsum.photos/id/1025/1200/900', caption: 'Hands-on tincture workshop', sortOrder: 2 },
    { url: 'https://picsum.photos/id/1035/1200/900', caption: 'Seminar Q&A session', sortOrder: 3 },
    { url: 'https://picsum.photos/id/1043/1200/900', caption: 'Herb identification walk', sortOrder: 4 },
  ];
  for (const image of galleryImages) {
    const existing = await prisma.galleryImage.findFirst({ where: { url: image.url } });
    if (!existing) await prisma.galleryImage.create({ data: image });
  }

  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword} (role ADMIN)`);
  console.log(`Seeded editor user: ${editorEmail} / ${editorPassword} (role CONTENT_EDITOR)`);
  console.log('Each login emails a 6-digit sign-in code to the admin address (requires EMAIL_PROVIDER).');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
