import type { EventConfig } from '@/types/event-config';

/**
 * Fixture de développement : événement hybride réaliste pour construire les
 * templates sans backend. Activée par NEXT_PUBLIC_USE_MOCK=1 (voir lib/api/events.ts).
 */
export const MOCK_EVENT_CONFIG: EventConfig = {
  event: {
    id: 'evt_mock_0001',
    slug: 'forum-horizons-2026',
    name: { fr: 'Forum Horizons Tech 2026', en: 'Horizons Tech Forum 2026' },
    date: '2026-09-26',
    start_time: '09:00',
    end_time: '18:00',
    location: 'Sofitel Abidjan Hôtel Ivoire',
    city: 'Abidjan',
    mode: 'hybrid',
    status: 'open',
    logo_url: null,
  },
  design: {
    template: 'A',
    colors: {
      primary: '#B4832C',
      secondary: '#1F3A5F',
      bg: '#FAF9F6',
      bg_mode: 'light',
      text: null,
    },
  },
  content: {
    hero_image_url: 'https://picsum.photos/seed/farahevent-hero/1920/1080',
    hero_video_url: null,
    description: {
      fr: '<p>Le Forum Horizons Tech réunit à Abidjan les décideurs, entrepreneurs et talents qui construisent le numérique ouest-africain. Une journée de keynotes, panels et rencontres pour transformer les idées en opportunités concrètes.</p><p>En présentiel au Sofitel Hôtel Ivoire ou en direct depuis chez vous : choisissez votre façon de participer.</p>',
      en: '<p>The Horizons Tech Forum brings together in Abidjan the decision-makers, entrepreneurs and talents building West African tech. A full day of keynotes, panels and networking to turn ideas into concrete opportunities.</p><p>On-site at the Sofitel Hôtel Ivoire or live from home: choose how you attend.</p>',
    },
    teaser_video_url: null,
    cta_presentiel: { fr: 'Participer en présentiel', en: 'Attend in person' },
    cta_online: { fr: 'Suivre en ligne', en: 'Watch online' },
  },
  formulas: [
    {
      id: 'form_standard',
      name: { fr: 'Standard', en: 'Standard' },
      description: {
        fr: 'L’essentiel du forum, en salle.',
        en: 'The full forum experience, on-site.',
      },
      advantages: [
        { fr: 'Accès à toutes les conférences', en: 'Access to all talks' },
        { fr: 'Pauses café & déjeuner inclus', en: 'Coffee breaks & lunch included' },
        { fr: 'Badge nominatif', en: 'Personal badge' },
      ],
      price: 35000,
      currency: 'XOF',
      channel: 'presentiel',
      remaining: 412,
      is_sold_out: false,
      is_featured: false,
      sort_order: 1,
    },
    {
      id: 'form_vip',
      name: { fr: 'VIP', en: 'VIP' },
      description: {
        fr: 'Une expérience privilégiée au plus près des speakers.',
        en: 'A premium experience, closest to the speakers.',
      },
      advantages: [
        { fr: 'Tout Standard, plus :', en: 'Everything in Standard, plus:' },
        { fr: 'Espace VIP & cocktail', en: 'VIP lounge & cocktail' },
        { fr: 'Placement prioritaire', en: 'Priority seating' },
        { fr: 'Rencontre avec les speakers', en: 'Meet & greet with speakers' },
      ],
      price: 150000,
      currency: 'XOF',
      channel: 'presentiel',
      remaining: 38,
      is_sold_out: false,
      is_featured: true,
      sort_order: 2,
    },
    {
      id: 'form_online',
      name: { fr: 'Standard Online', en: 'Standard Online' },
      description: {
        fr: 'Le forum en direct HD, où que vous soyez.',
        en: 'The forum in HD live, wherever you are.',
      },
      advantages: [
        { fr: 'Live HD 720p', en: 'HD 720p live stream' },
        { fr: 'Sous-titres FR/EN', en: 'FR/EN subtitles' },
        { fr: 'Replay 48 h', en: '48-hour replay' },
      ],
      price: 35000,
      currency: 'XOF',
      channel: 'online',
      remaining: null,
      is_sold_out: false,
      is_featured: false,
      sort_order: 3,
    },
  ],
  speakers: [
    {
      id: 'spk_1',
      name: 'Aïcha Koné',
      title: { fr: 'CEO, Djiguiba Capital', en: 'CEO, Djiguiba Capital' },
      bio: {
        fr: 'Investisseuse de référence de la tech francophone, elle accompagne plus de 40 startups ouest-africaines.',
        en: 'A leading investor in francophone tech, she backs more than 40 West African startups.',
      },
      photo_url: 'https://i.pravatar.cc/800?img=47',
      sort_order: 1,
    },
    {
      id: 'spk_2',
      name: 'Yao N’Guessan',
      title: { fr: 'CTO, WariPay', en: 'CTO, WariPay' },
      bio: {
        fr: 'Architecte des infrastructures de paiement qui traitent des millions de transactions mobile money par jour.',
        en: 'Architect of payment infrastructure processing millions of mobile money transactions daily.',
      },
      photo_url: 'https://i.pravatar.cc/800?img=12',
      sort_order: 2,
    },
    {
      id: 'spk_3',
      name: 'Fatou Diabaté',
      title: { fr: 'Directrice IA, Orange CI', en: 'Head of AI, Orange CI' },
      bio: {
        fr: 'Elle pilote les programmes d’intelligence artificielle appliquée aux services publics et à la santé.',
        en: 'She leads applied AI programs for public services and healthcare.',
      },
      photo_url: 'https://i.pravatar.cc/800?img=32',
      sort_order: 3,
    },
    {
      id: 'spk_4',
      name: 'Kwame Mensah',
      title: { fr: 'Fondateur, AgriTech GH', en: 'Founder, AgriTech GH' },
      bio: {
        fr: 'Pionnier de l’agriculture connectée au Ghana, présent dans 6 pays de la sous-région.',
        en: 'Pioneer of connected farming in Ghana, operating in 6 countries across the region.',
      },
      photo_url: 'https://i.pravatar.cc/800?img=68',
      sort_order: 4,
    },
  ],
  programme: [
    {
      id: 'prg_1',
      start_time: '09:00',
      end_time: '09:30',
      title: { fr: 'Ouverture officielle', en: 'Official opening' },
      description: {
        fr: 'Mot de bienvenue et vision du forum.',
        en: 'Welcome address and forum vision.',
      },
      speaker_ids: [],
      sort_order: 1,
    },
    {
      id: 'prg_2',
      start_time: '10:00',
      end_time: '11:00',
      title: { fr: 'Keynote — Financer la tech africaine', en: 'Keynote — Funding African tech' },
      description: {
        fr: 'Où va le capital-risque ouest-africain en 2026 ?',
        en: 'Where is West African venture capital heading in 2026?',
      },
      speaker_ids: ['spk_1'],
      sort_order: 2,
    },
    {
      id: 'prg_3',
      start_time: '11:30',
      end_time: '12:30',
      title: { fr: 'Panel — Paiements sans frontières', en: 'Panel — Borderless payments' },
      description: {
        fr: 'Interopérabilité mobile money, cartes et stablecoins.',
        en: 'Mobile money, cards and stablecoin interoperability.',
      },
      speaker_ids: ['spk_2', 'spk_1'],
      sort_order: 3,
    },
    {
      id: 'prg_4',
      start_time: '14:00',
      end_time: '15:00',
      title: { fr: 'IA utile : cas concrets ivoiriens', en: 'Useful AI: real Ivorian use cases' },
      description: {
        fr: 'Santé, éducation, administration : ce qui marche déjà.',
        en: 'Healthcare, education, government: what already works.',
      },
      speaker_ids: ['spk_3'],
      sort_order: 4,
    },
    {
      id: 'prg_5',
      start_time: '15:30',
      end_time: '16:30',
      title: { fr: 'Nourrir 400 millions de personnes', en: 'Feeding 400 million people' },
      description: {
        fr: 'L’agritech comme levier de souveraineté alimentaire.',
        en: 'Agritech as a lever for food sovereignty.',
      },
      speaker_ids: ['spk_4'],
      sort_order: 5,
    },
    {
      id: 'prg_6',
      start_time: '17:00',
      end_time: '18:00',
      title: { fr: 'Clôture & networking', en: 'Closing & networking' },
      description: {
        fr: 'Cocktail de clôture avec les speakers et partenaires.',
        en: 'Closing cocktail with speakers and partners.',
      },
      speaker_ids: [],
      sort_order: 6,
    },
  ],
  stats: [
    { value: 1500, suffix: '+', label: { fr: 'participants attendus', en: 'expected attendees' } },
    { value: 12, suffix: null, label: { fr: 'speakers internationaux', en: 'international speakers' } },
    { value: 3000, suffix: '+', label: { fr: 'viewers en ligne', en: 'online viewers' } },
  ],
  faqs: [
    {
      id: 'faq_1',
      question: { fr: 'Comment vais-je recevoir mon billet ?', en: 'How will I receive my ticket?' },
      answer: {
        fr: 'Par email et WhatsApp immédiatement après confirmation du paiement, sous forme de QR code.',
        en: 'By email and WhatsApp right after payment confirmation, as a QR code.',
      },
    },
    {
      id: 'faq_2',
      question: { fr: 'Puis-je payer par Western Union ?', en: 'Can I pay via Western Union?' },
      answer: {
        fr: 'Oui. Choisissez « Paiement manuel », suivez les instructions puis envoyez la photo de votre reçu. Validation sous 2 à 12 h.',
        en: 'Yes. Choose “Manual payment”, follow the instructions then upload a photo of your receipt. Validated within 2 to 12 hours.',
      },
    },
    {
      id: 'faq_3',
      question: { fr: 'Le lien du live est-il partageable ?', en: 'Can I share my live link?' },
      answer: {
        fr: 'Non : une seule connexion active par billet. Toute nouvelle connexion déconnecte la précédente.',
        en: 'No: one active session per ticket. Any new connection ends the previous one.',
      },
    },
    {
      id: 'faq_4',
      question: { fr: 'Y a-t-il un replay ?', en: 'Is there a replay?' },
      answer: {
        fr: 'Oui, disponible 48 h pour les billets online, envoyé le lendemain de l’événement.',
        en: 'Yes, available for 48 hours for online tickets, sent the day after the event.',
      },
    },
    {
      id: 'faq_5',
      question: { fr: 'Puis-je me faire rembourser ?', en: 'Can I get a refund?' },
      answer: {
        fr: 'Les billets sont remboursables jusqu’à 7 jours avant l’événement, sur demande au support.',
        en: 'Tickets are refundable up to 7 days before the event, upon request to support.',
      },
    },
  ],
  partners: [
    { id: 'ptn_1', name: 'WariPay', logo_url: 'https://picsum.photos/seed/logo-waripay/400/200', url: 'https://example.com', sort_order: 1 },
    { id: 'ptn_2', name: 'Orange CI', logo_url: 'https://picsum.photos/seed/logo-orange/400/200', url: 'https://example.com', sort_order: 2 },
    { id: 'ptn_3', name: 'Djiguiba Capital', logo_url: 'https://picsum.photos/seed/logo-djiguiba/400/200', url: null, sort_order: 3 },
    { id: 'ptn_4', name: 'AgriTech GH', logo_url: 'https://picsum.photos/seed/logo-agritech/400/200', url: 'https://example.com', sort_order: 4 },
  ],
  options: {
    show_tickets_counter: true,
    show_countdown: true,
    show_speakers: true,
    show_live_qa: true,
    digital_enabled: true,
    manual_enabled: true,
    chatbot_enabled: true,
    marquee_text: {
      fr: 'FORUM HORIZONS TECH • 26 SEPTEMBRE 2026 • ABIDJAN',
      en: 'HORIZONS TECH FORUM • SEPTEMBER 26, 2026 • ABIDJAN',
    },
  },
  footer: {
    about: {
      fr: 'Le rendez-vous annuel de la tech ouest-africaine, à Abidjan et en ligne.',
      en: 'The annual West African tech gathering, in Abidjan and online.',
    },
    contact_email: 'contact@farahevent.tech',
    contact_whatsapp: '+2250700000000',
    address: 'Abidjan, Côte d’Ivoire',
    socials: [
      { kind: 'linkedin', url: 'https://linkedin.com/company/example' },
      { kind: 'instagram', url: 'https://instagram.com/example' },
      { kind: 'x', url: 'https://x.com/example' },
    ],
  },
  support: {
    service_name: 'Service Billetterie',
    whatsapp_number: '+2250700000000',
  },
  is_live: false,
};
