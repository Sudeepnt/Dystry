import type { AtomicProcess, BusinessModel, ResearchSource, Strategy, Subproblem } from "@/lib/types";

const createdAt = "2026-05-20T00:00:00.000Z";

export const fallbackSubproblems: Subproblem[] = [
  "Audience identification",
  "Message-market fit",
  "Channel selection",
  "Content velocity",
  "Lead nurturing",
  "Conversion optimisation",
  "Referral mechanics",
  "Retention signals",
  "Pricing strategy",
  "Partnership development",
  "Community building",
  "Event strategy",
  "Influencer selection",
  "SEO / AEO",
  "Paid acquisition",
  "Product virality",
  "Sales process design",
  "ICP definition",
  "Distributor management",
  "Beat planning",
  "Prescriber seeding",
  "Press & narrative",
  "Speed-to-lead",
  "Onboarding -> activation",
  "Upsell / expansion",
  "Win-back campaigns",
  "Attribution modelling",
  "Creative testing",
  "Brand positioning",
  "Category creation",
  "Marketplace strategy",
  "Partner enablement",
  "Data enrichment",
  "Cold outreach",
  "Social proof engineering",
  "Review generation",
  "Trade scheme design",
  "Demo optimisation",
  "Contract velocity",
].map((name, index) => ({
  id: `subproblem-${index + 1}`,
  name,
  created_at: createdAt,
}));

export const fallbackSources: ResearchSource[] = [
  ["Academic research", "Marketing, strategy, economics, diffusion, and organizational behavior research."],
  ["Growth teardowns", "Breakdowns of acquisition, activation, retention, and monetization loops."],
  ["Founder interviews", "Primary operator accounts of what moved distribution in the field."],
  ["Community intelligence", "Practitioner threads, private communities, and tactical social posts."],
  ["India-specific sources", "Local channel behavior, regional constraints, and India market distribution patterns."],
  ["Practitioner content", "Playbooks, podcasts, templates, essays, and tactical operating notes."],
  ["Industry data", "Reports, benchmarks, market maps, category trends, and disclosures."],
  ["Live web research", "Current competitive scans, search behavior, and channel experiments."],
].map(([title, description], index) => ({
  id: `source-${index + 1}`,
  title,
  description,
  created_at: createdAt,
}));

const modelRecords = [
  ["Digital Content", ["YouTube channel", "Podcast", "Newsletter/Substack", "Twitch stream", "TikTok creator", "Blog network", "Online course", "Digital magazine", "Paid community", "Micro-content creator"], "Ad-supported, subscriptions, sponsorships, digital products.", "B2C, direct audience, community-led trust.", "Digital content and information products.", "Internet-native, potentially global.", "Strategy flips completely at 10K vs 100K vs 1M subscribers.", "Distribution compounds through taste, cadence, authority, and platform leverage."],
  ["SaaS & Software", ["Vertical SaaS", "Horizontal SaaS", "Developer tools", "No-code platform", "AI-native app", "Browser extension", "API business", "Open-source + paid", "B2B SaaS", "B2C SaaS", "PLG product", "Sales-led enterprise"], "Subscription, usage-based, seat-based, freemium.", "Onboarding, activation, expansion, support, and renewal.", "Workflow software, infrastructure, AI tools, and vertical apps.", "Scales through product-led, sales-led, partner-led, or hybrid motions.", "Changes sharply by ACV, category maturity, and buyer/user split.", "ICP quality and activation clarity decide the first durable channel."],
  ["E-commerce & D2C", ["Physical DTC brand", "Amazon-native brand", "Dropshipping operation", "Subscription box", "Print-on-demand", "Etsy seller", "Niche product site", "CPG brand", "Luxury goods", "Sustainable/ethical brand"], "Product sales, bundles, subscriptions, memberships.", "Transactional relationship deepened through retention and brand.", "Physical goods, digital goods, consumables, and niche products.", "Scales through paid acquisition, marketplace ranking, retail, and retention.", "Creative, margin, supply chain, and repeat purchase shape the channel mix.", "Brand positioning and creative testing are core distribution work."],
  ["Marketplace & Platform", ["Two-sided marketplace", "Gig platform", "Aggregator", "Vertical platform", "Community + commerce hybrid", "SaaS with marketplace layer", "Peer-to-peer exchange"], "Take rate, listing fees, subscriptions, ads, services.", "Multi-sided relationship across supply and demand.", "Liquidity, matching, discovery, trust, and workflow layers.", "Scales after solving cold start and density in a narrow wedge.", "Early stage depends on constrained liquidity and sequencing.", "Distribution must be sequenced side-by-side, not sprayed equally."],
  ["Professional Services", ["Law firm", "CA / accounting firm", "Management consultancy", "Design agency", "Marketing agency", "Architecture firm", "HR / recruitment firm", "Executive coaching", "PR firm", "Research firm"], "Retainers, projects, advisory, implementation.", "Trust-heavy relationship driven by proof and direct sales.", "Expert labor, consulting, audits, and outsourced capability.", "Scales through specialization, reputation, process, and hiring.", "Founder credibility matters before repeatable pipeline exists.", "Proof-led distribution usually beats generic lead generation."],
  ["Traditional B2B Product", ["Industrial equipment manufacturer", "FMCG producer", "Raw material supplier", "B2B distributor/wholesaler", "OEM supplier", "Chemical company", "Hardware/IoT product", "Agricultural input supplier"], "Wholesale, enterprise contracts, tenders, repeat orders.", "Buyer, influencer, procurement, distributor, and operator relationships.", "Physical products, machinery, inputs, components, and supplies.", "Scales through channel networks, field sales, and partner enablement.", "Offline trust and access dominate early motion.", "The buying committee and channel mechanics are the product's real path."],
  ["Traditional Retail & Local", ["Kirana/general store", "Restaurant", "Salon", "Clinic", "Gym", "Real estate agent", "Travel agent", "Repair service", "Local franchise", "Cloud kitchen", "Pet care service"], "Walk-in sales, services, memberships, repeat purchase.", "Geographic, reputation-led, and repeat-visit relationship.", "Local services, retail, experiences, food, and wellness.", "Scales through reviews, referrals, search, partnerships, and operations.", "Local awareness comes before sophisticated funnel design.", "Search, reviews, and service consistency matter first."],
  ["Financial & Investment", ["Mutual fund", "Private equity firm", "Venture capital", "Wealth advisor", "Fintech lending", "Fintech payments", "Insurance company", "NBFC", "Crypto fund", "Family office"], "AUM fees, advisory fees, commissions, spreads, subscriptions.", "Trust, compliance, performance, education, and long-cycle relationship.", "Research, advisory, lending, investing, insurance, and fintech workflows.", "Scales through credibility, regulation-safe acquisition, and retention.", "Trust formation precedes conversion optimization.", "Authority and risk reduction are core distribution assets."],
  ["Media & Publishing", ["News organisation", "OTT platform", "Music label", "Book publisher", "Gaming studio", "Sports franchise", "Events company", "Podcast network", "Influencer agency"], "Ads, subscriptions, sponsorship, licensing, events, commerce.", "Habit, identity, attention, and credibility relationship.", "Editorial IP, entertainment, communities, and audience products.", "Scales through cadence, distribution partnerships, owned audience, and brand.", "Early stage depends on niche wedge; later stage depends on retention and monetization mix.", "The product is partly the content and partly the attention system around it."],
  ["Education", ["K-12 school", "Edtech platform", "Coaching institute", "Corporate L&D", "Professional certification body", "Bootcamp", "Tutoring network", "University", "Skill platform", "Test prep brand"], "Tuition, courses, certificates, coaching, B2B training.", "Learning, motivation, assessment, community, and progress relationship.", "Courses, schools, tutoring, bootcamps, cohorts, and assessments.", "Scales through outcomes, reputation, partnerships, and placement loops.", "Outcome proof drives early demand.", "Distribution depends on credible transformation."],
  ["Healthcare & Wellness", ["Hospital", "Diagnostic chain", "Telemedicine platform", "Pharma company", "Nutraceutical brand", "Mental health app", "Fitness platform", "Ayurveda/wellness brand", "Elder care service"], "Consultations, subscriptions, packages, memberships.", "Trust, continuity, outcomes, privacy, and sensitivity.", "Care services, wellness products, diagnostics, clinics, and health apps.", "Scales through trust networks, referrals, compliance, and providers.", "Credibility and evidence are non-negotiable.", "Marketing cannot outrun trust and safety."],
  ["Real Estate", ["Developer", "Broker/agent", "Co-working operator", "Proptech platform", "REIT", "Vacation rental operator", "Commercial leasing firm", "Interior design firm"], "Brokerage, commissions, listing fees, leads, services.", "High-ticket, local, relationship-heavy transaction relationship.", "Properties, brokerage, discovery platforms, services, and financing.", "Scales through inventory, broker networks, local search, and trust.", "Listings or leads decide early motion.", "Inventory quality and local credibility beat generic campaigns."],
  ["Infrastructure & Logistics", ["3PL provider", "Freight broker", "Last-mile delivery", "Cold chain operator", "Fulfilment centre", "SaaS for logistics", "Shipping aggregator", "Customs & trade compliance"], "Contracts, usage fees, service fees, enterprise agreements.", "Operational reliability, procurement, integration, and performance.", "Transport, warehousing, supply chain, APIs, and infrastructure networks.", "Scales through density, enterprise trust, integrations, and partners.", "Operational proof reduces switching resistance.", "Distribution is tied directly to execution reliability."],
  ["Non-Profit & Mission", ["NGO", "Social enterprise", "DAO", "Open-source foundation", "Advocacy organisation", "Grant-funded research", "Impact fund", "Religious institution"], "Donations, grants, memberships, sponsorship, partnerships.", "Mission, trust, community, donor, and stakeholder relationship.", "Programs, advocacy, services, education, aid, and public-good initiatives.", "Scales through narrative, impact proof, partnerships, and volunteers.", "Mission clarity precedes funding repeatability.", "Distribution means belief formation as much as acquisition."],
] as const;

export const fallbackBusinessModels: BusinessModel[] = modelRecords.map((record, index) => ({
  id: `model-${index + 1}`,
  title: record[0],
  revenue_model: record[2],
  customer_relationship: record[3],
  product_type: record[4],
  scale_profile: record[5],
  stage_sensitivity: record[6],
  notes: record[7],
  created_at: createdAt,
  business_model_types: record[1].map((name, tagIndex) => ({
    id: `model-${index + 1}-type-${tagIndex + 1}`,
    business_model_id: `model-${index + 1}`,
    name,
  })),
}));

export const fallbackStrategies: Strategy[] = [];

export const fallbackAtomicProcesses: AtomicProcess[] = [];
