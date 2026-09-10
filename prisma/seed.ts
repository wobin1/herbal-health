import { PrismaClient } from '@prisma/client';

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

  await prisma.educationalFocusItem.createMany({
    data: [
      {
        icon: 'shield',
        title: 'Evidence-Informed Content',
        description: 'Curriculum reviewed by licensed naturopathic doctors and herbal educators.',
        sortOrder: 1,
      },
      {
        icon: 'heart',
        title: 'Hands-On Practical Skills',
        description: 'Leave with techniques you can apply at home the very same day.',
        sortOrder: 2,
      },
      {
        icon: 'certificate',
        title: 'Certificate of Completion',
        description: 'Every attendee receives a certificate to mark their achievement.',
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

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
      question: 'Do I need any prior knowledge to attend a seminar?',
      answer: 'No prior knowledge is required — our seminars are designed for all experience levels.',
      sortOrder: 1,
    },
    {
      question: 'Are seminars refundable?',
      answer: 'Yes, refunds are available according to our refund policy for each event.',
      sortOrder: 2,
    },
    {
      question: 'Is this seminar series a substitute for medical advice?',
      answer:
        'No. Our seminars are educational only and are not a substitute for professional medical advice, diagnosis, or treatment.',
      sortOrder: 3,
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
      title: 'About the Herbal Health Seminar Series',
      body: 'The Herbal Health Seminar Series brings accessible, evidence-informed herbal health education to communities across the country.\n\nOur instructors combine traditional herbal knowledge with modern research to help attendees make informed wellness decisions.',
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
