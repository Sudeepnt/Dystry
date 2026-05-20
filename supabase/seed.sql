insert into overview_subproblems (name) values
  ('Audience identification'),
  ('Message-market fit'),
  ('Channel selection'),
  ('Content velocity'),
  ('Lead nurturing'),
  ('Conversion optimisation'),
  ('Referral mechanics'),
  ('Retention signals'),
  ('Pricing strategy'),
  ('Partnership development'),
  ('Community building'),
  ('Event strategy'),
  ('Influencer selection'),
  ('SEO / AEO'),
  ('Paid acquisition'),
  ('Product virality'),
  ('Sales process design'),
  ('ICP definition'),
  ('Distributor management'),
  ('Beat planning'),
  ('Prescriber seeding'),
  ('Press & narrative'),
  ('Speed-to-lead'),
  ('Onboarding -> activation'),
  ('Upsell / expansion'),
  ('Win-back campaigns'),
  ('Attribution modelling'),
  ('Creative testing'),
  ('Brand positioning'),
  ('Category creation'),
  ('Marketplace strategy'),
  ('Partner enablement'),
  ('Data enrichment'),
  ('Cold outreach'),
  ('Social proof engineering'),
  ('Review generation'),
  ('Trade scheme design'),
  ('Demo optimisation'),
  ('Contract velocity')
on conflict (name) do nothing;

insert into research_sources (title, description) values
  ('Academic research', 'Peer-reviewed marketing, strategy, economics, diffusion, and organizational behavior research.'),
  ('Growth teardowns', 'Detailed breakdowns of acquisition, activation, retention, and monetization loops that worked in market.'),
  ('Founder interviews', 'Primary accounts from operators describing what actually moved distribution.'),
  ('Community intelligence', 'Forums, private communities, social posts, and practitioner threads with field-level truth.'),
  ('India-specific sources', 'India market distribution patterns, channel realities, regional behavior, and local constraints.'),
  ('Practitioner content', 'Playbooks, essays, podcasts, templates, and tactical operating notes from domain experts.'),
  ('Industry data', 'Reports, benchmarks, market maps, funding data, category trends, and public company disclosures.'),
  ('Live web research', 'Current competitive scans, search behavior, channel experiments, and tactical observations.')
on conflict (title) do update set description = excluded.description;

insert into business_models (title, revenue_model, customer_relationship, product_type, scale_profile, stage_sensitivity, notes) values
  ('Digital Content', 'Subscriptions, ads, sponsorship, courses, communities, paid reports, bundles.', 'High-trust audience relationship with repeated attention capture.', 'Information, entertainment, education, analysis, and opinion.', 'Can start as single-creator and scale into media or community infrastructure.', 'Early stage depends on niche clarity and publishing cadence; later stage depends on retention and brand.', 'Distribution often depends on compounding trust, format-market fit, and platform dependency management.'),
  ('SaaS & Software', 'Subscription, usage-based, seat-based, freemium, enterprise contracts.', 'Recurring relationship with onboarding, activation, expansion, support, and renewal loops.', 'Workflow software, infrastructure, AI tools, vertical applications, and horizontal utilities.', 'Scales through product-led, sales-led, partner-led, or hybrid motions.', 'Early stage needs ICP and activation clarity; later stage needs pipeline, retention, and expansion systems.', 'Distribution reality changes sharply by ACV, user buyer split, sales cycle, and category maturity.'),
  ('E-commerce & D2C', 'Product sales, bundles, subscriptions, memberships, marketplaces, repeat purchase.', 'Transactional relationship that can deepen through retention, community, service, and content.', 'Physical goods, digital goods, consumables, apparel, beauty, electronics, and niche products.', 'Scales through paid acquisition, organic content, marketplace ranking, retail, and retention.', 'Early stage validates demand and creative; later stage fights CAC, margin, supply chain, and repeat purchase.', 'Brand positioning and creative testing are often as important as channel selection.'),
  ('Marketplace & Platform', 'Take rate, listing fees, subscriptions, ads, transaction services, payments.', 'Multi-sided relationship across supply, demand, and sometimes third-party ecosystem actors.', 'Liquidity, matching, discovery, transaction, trust, and workflow layers.', 'Scales after solving cold start and density problems in a narrow wedge.', 'Early stage depends on constrained liquidity; later stage depends on trust, retention, and category expansion.', 'Distribution must usually be sequenced side-by-side, not sprayed across both markets equally.'),
  ('Professional Services', 'Retainers, projects, advisory, success fees, implementation, managed services.', 'Trust-heavy relationship driven by expertise, proof, referrals, and direct sales.', 'Expert labor, consulting, execution, audits, transformation, and outsourced capability.', 'Scales through specialization, reputation, process productization, hiring, and partnerships.', 'Early stage needs founder-led credibility; later stage needs repeatable pipeline and delivery quality.', 'Distribution is usually proof-led and founder-led until category authority compounds.'),
  ('Traditional B2B Product', 'Wholesale, distribution, enterprise sales, contracts, tenders, repeat orders.', 'Buyer, influencer, procurement, distributor, and operator relationships.', 'Physical products, machinery, inputs, components, supplies, and industrial goods.', 'Scales through channel networks, field sales, procurement access, and partner enablement.', 'Early stage depends on access and trust; later stage depends on channel coverage and account penetration.', 'The buying committee and offline channel mechanics dominate the distribution system.'),
  ('Traditional Retail & Local', 'Walk-in sales, service revenue, memberships, repeat purchase, local partnerships.', 'Geographic, reputation-led, and repeat-visit relationship.', 'Local services, retail inventory, experiences, food, wellness, and neighborhood commerce.', 'Scales through location density, reviews, referrals, local discovery, and operations consistency.', 'Early stage needs local awareness; later stage needs standardization and location-level economics.', 'Search, reviews, word of mouth, and local partnerships usually matter before advanced funnels.'),
  ('Financial & Investment', 'AUM fees, transaction fees, advisory fees, commissions, spreads, subscriptions.', 'Trust, compliance, performance, education, and long-cycle relationship management.', 'Financial products, research, advisory, lending, investing, insurance, and fintech workflows.', 'Scales through credibility, regulation-safe acquisition, channel partnerships, and retention.', 'Early stage depends on trust formation; later stage depends on compliance, risk, and lifetime value.', 'Proof, authority, and risk reduction are core distribution assets.'),
  ('Media & Publishing', 'Ads, subscriptions, sponsorship, licensing, syndication, events, commerce.', 'Habit, identity, attention, and credibility relationship.', 'News, analysis, entertainment, newsletters, podcasts, video, and editorial IP.', 'Scales through editorial cadence, distribution partnerships, SEO, social, and owned audience.', 'Early stage depends on niche wedge; later stage depends on brand, retention, and monetization mix.', 'The product is partly the content and partly the attention system around it.'),
  ('Education', 'Tuition, courses, subscriptions, certificates, coaching, B2B training, outcomes-based fees.', 'Learning, motivation, assessment, community, and progress relationship.', 'Courses, schools, tutoring, bootcamps, cohorts, assessments, and learning platforms.', 'Scales through outcomes, reputation, content, partnerships, and placement loops.', 'Early stage needs outcome proof; later stage needs trust, curriculum quality, and repeatable acquisition.', 'Distribution depends heavily on perceived transformation and credible outcomes.'),
  ('Healthcare & Wellness', 'Consultations, subscriptions, product sales, insurance, packages, memberships.', 'Trust, continuity, outcomes, privacy, and high-sensitivity relationship.', 'Care services, wellness products, diagnostics, clinics, health apps, and provider tools.', 'Scales through trust networks, referrals, compliance, content, and provider relationships.', 'Early stage needs credibility; later stage needs operations, retention, and regulatory discipline.', 'Distribution cannot be separated from trust, safety, and evidence.'),
  ('Real Estate', 'Brokerage, commissions, listing fees, leads, subscriptions, services, asset sales.', 'High-ticket, local, relationship-heavy, long-cycle transaction relationship.', 'Properties, brokerage, discovery platforms, property services, construction, and financing.', 'Scales through inventory access, broker networks, local search, trust, and financing partners.', 'Early stage needs listings or leads; later stage needs network density and transaction throughput.', 'Inventory quality and local credibility often beat generic marketing.'),
  ('Infrastructure & Logistics', 'Contracts, usage fees, service fees, subscriptions, enterprise agreements.', 'Operational reliability, procurement, integration, and performance relationship.', 'Transport, warehousing, supply chain, infrastructure services, APIs, and networks.', 'Scales through operations density, enterprise trust, integrations, and partner networks.', 'Early stage needs specific use-case reliability; later stage needs network effects and utilization.', 'Distribution is tied to operational proof and switching-cost reduction.'),
  ('Non-Profit & Mission', 'Donations, grants, memberships, sponsorship, partnerships, merchandise.', 'Mission, trust, community, beneficiary, donor, and stakeholder relationship.', 'Programs, advocacy, services, education, aid, community, and public-good initiatives.', 'Scales through narrative, partnerships, volunteer networks, proof of impact, and institutional support.', 'Early stage needs mission clarity; later stage needs governance, measurement, and funding repeatability.', 'Distribution means belief formation as much as acquisition.')
on conflict (title) do update set
  revenue_model = excluded.revenue_model,
  customer_relationship = excluded.customer_relationship,
  product_type = excluded.product_type,
  scale_profile = excluded.scale_profile,
  stage_sensitivity = excluded.stage_sensitivity,
  notes = excluded.notes;

insert into business_model_types (business_model_id, name)
select bm.id, tag.name
from business_models bm
join (
  values
    ('Digital Content', 'Newsletter'),
    ('Digital Content', 'Creator business'),
    ('Digital Content', 'Paid community'),
    ('SaaS & Software', 'Horizontal SaaS'),
    ('SaaS & Software', 'Vertical SaaS'),
    ('SaaS & Software', 'AI workflow tool'),
    ('E-commerce & D2C', 'Beauty brand'),
    ('E-commerce & D2C', 'Consumables'),
    ('E-commerce & D2C', 'Niche D2C'),
    ('Marketplace & Platform', 'B2B marketplace'),
    ('Marketplace & Platform', 'Local services platform'),
    ('Marketplace & Platform', 'Creator marketplace'),
    ('Professional Services', 'Agency'),
    ('Professional Services', 'Consulting firm'),
    ('Professional Services', 'Implementation partner'),
    ('Traditional B2B Product', 'Industrial product'),
    ('Traditional B2B Product', 'Dealer-led product'),
    ('Traditional B2B Product', 'Distributor-led product'),
    ('Traditional Retail & Local', 'Clinic'),
    ('Traditional Retail & Local', 'Restaurant'),
    ('Traditional Retail & Local', 'Local store'),
    ('Financial & Investment', 'Investment research'),
    ('Financial & Investment', 'Advisory'),
    ('Financial & Investment', 'Fintech'),
    ('Media & Publishing', 'Newsroom'),
    ('Media & Publishing', 'Podcast network'),
    ('Media & Publishing', 'Trade publication'),
    ('Education', 'Cohort course'),
    ('Education', 'Tutoring'),
    ('Education', 'B2B training'),
    ('Healthcare & Wellness', 'Wellness app'),
    ('Healthcare & Wellness', 'Clinic network'),
    ('Healthcare & Wellness', 'Diagnostics'),
    ('Real Estate', 'Brokerage'),
    ('Real Estate', 'Listing platform'),
    ('Real Estate', 'Developer'),
    ('Infrastructure & Logistics', 'Warehousing'),
    ('Infrastructure & Logistics', 'Supply chain SaaS'),
    ('Infrastructure & Logistics', 'Fleet network'),
    ('Non-Profit & Mission', 'Foundation'),
    ('Non-Profit & Mission', 'Advocacy group'),
    ('Non-Profit & Mission', 'Impact community')
) as tag(title, name) on tag.title = bm.title
on conflict (business_model_id, name) do nothing;

insert into strategies (title, strategy_category, stage, primary_metric, channel_mechanism, evidence_quality, landmark_example, failure_conditions, key_variables, dark_secrets) values
  ('Opinionated Founder-Led Content Loop', 'Content/SEO', '0 -> 1 and category formation', 'Qualified inbound conversations', 'Founder publishes sharp point-of-view essays and distributes through owned audience, social, podcast appearances, and partner newsletters.', 'Medium-high when paired with consistent inbound and sales source tracking.', 'Vertical SaaS and advisory firms that convert niche authority into sales pipeline.', 'Fails when the POV is generic, inconsistent, or disconnected from buyer pain.', 'Niche sharpness, cadence, founder credibility, CTA quality, repurposing system.', 'Most of the leverage comes from private distribution after publishing, not the post itself.'),
  ('Narrow ICP Outbound Wedge', 'Outbound', '0 -> 1 and early repeatability', 'Meetings booked with qualified accounts', 'Build a tight account list, enrich context, send personalized problem-led outreach, and follow up across email and social.', 'High when the account list and qualification criteria are disciplined.', 'B2B products selling into a narrow buyer role with obvious trigger events.', 'Fails with broad ICPs, weak triggers, commodity copy, or slow follow-up.', 'ICP specificity, trigger freshness, proof, offer clarity, sequence quality.', 'The list is the strategy; copy only works after account selection is right.'),
  ('Review-Led Local Demand Capture', 'Local SEO', 'Early and scaling local presence', 'Calls, bookings, and store visits', 'Systematically generate reviews, optimize local pages, publish service/location content, and route leads fast.', 'High in local service and retail markets with search intent.', 'Clinics, salons, restaurants, repair services, and local professional services.', 'Fails when service quality is inconsistent or reviews are not continuously generated.', 'Review velocity, response quality, local keywords, speed-to-lead, location density.', 'The hidden engine is operations discipline; marketing only exposes the current truth.'),
  ('Partner Channel Enablement', 'Partnerships', 'Scaling and market expansion', 'Partner-sourced pipeline or revenue', 'Recruit aligned partners and give them positioning, assets, incentives, training, lead routing, and proof.', 'Medium-high when partner attribution and activation are tracked.', 'B2B products, infrastructure, education, and services with complementary channel owners.', 'Fails when partners are recruited but not enabled or incentivized.', 'Partner fit, activation assets, deal protection, economics, enablement cadence.', 'Most partner programs are dead databases unless someone actively manages partner behavior.')
on conflict (title) do update set
  strategy_category = excluded.strategy_category,
  stage = excluded.stage,
  primary_metric = excluded.primary_metric,
  channel_mechanism = excluded.channel_mechanism,
  evidence_quality = excluded.evidence_quality,
  landmark_example = excluded.landmark_example,
  failure_conditions = excluded.failure_conditions,
  key_variables = excluded.key_variables,
  dark_secrets = excluded.dark_secrets;

insert into strategy_business_models (strategy_id, business_model_id)
select s.id, bm.id
from strategies s
join (
  values
    ('Opinionated Founder-Led Content Loop', 'Digital Content'),
    ('Opinionated Founder-Led Content Loop', 'SaaS & Software'),
    ('Opinionated Founder-Led Content Loop', 'Professional Services'),
    ('Narrow ICP Outbound Wedge', 'SaaS & Software'),
    ('Narrow ICP Outbound Wedge', 'Traditional B2B Product'),
    ('Narrow ICP Outbound Wedge', 'Infrastructure & Logistics'),
    ('Review-Led Local Demand Capture', 'Traditional Retail & Local'),
    ('Review-Led Local Demand Capture', 'Healthcare & Wellness'),
    ('Review-Led Local Demand Capture', 'Professional Services'),
    ('Partner Channel Enablement', 'SaaS & Software'),
    ('Partner Channel Enablement', 'Education'),
    ('Partner Channel Enablement', 'Traditional B2B Product')
) as rel(strategy_title, model_title) on rel.strategy_title = s.title
join business_models bm on bm.title = rel.model_title
on conflict (strategy_id, business_model_id) do nothing;

insert into atomic_processes (
  title,
  related_strategy_id,
  pain_frequency,
  software_replaceability,
  willingness_to_pay,
  composability,
  input_text,
  action_text,
  output_text,
  software_ownable,
  product_brief,
  shortlisted
) values
  (
    'Trigger-Based ICP Account List Builder',
    (select id from strategies where title = 'Narrow ICP Outbound Wedge'),
    5,
    5,
    4,
    5,
    'Target market, buyer role, exclusions, territory, and trigger definitions.',
    'Find accounts matching the ICP, enrich trigger context, dedupe, score, and export a prioritized list.',
    'A ranked account list with reasons to contact each account now.',
    'Yes. Software can own discovery, enrichment, scoring, and refresh cadence.',
    'A research agent that continuously builds and updates outbound account lists from public signals.',
    true
  ),
  (
    'Review Request Timing Engine',
    (select id from strategies where title = 'Review-Led Local Demand Capture'),
    5,
    4,
    4,
    4,
    'Customer transaction, service completion status, NPS or satisfaction signal, and channel permission.',
    'Detect best review-request window, personalize the ask, route by location, and suppress risky sends.',
    'More high-quality local reviews without manual staff follow-up.',
    'Mostly. Human service quality still controls the ceiling.',
    'A lightweight local reputation system that automates review timing and follow-up across branches.',
    true
  ),
  (
    'Partner Enablement Asset Generator',
    (select id from strategies where title = 'Partner Channel Enablement'),
    4,
    4,
    4,
    5,
    'Partner type, ICP, offer, objection set, proof points, and incentive rules.',
    'Generate partner-specific pitch decks, one-pagers, email scripts, objection handling, and enablement checklists.',
    'A partner-ready enablement pack mapped to the partner relationship and target buyer.',
    'Yes for first-pass assets and updates; partner management remains human-led.',
    'A channel enablement workstation that turns raw product positioning into partner-specific sales assets.',
    false
  ),
  (
    'Founder POV Repurposing Queue',
    (select id from strategies where title = 'Opinionated Founder-Led Content Loop'),
    4,
    4,
    3,
    4,
    'Long-form founder notes, target audience, proof points, channels, and publishing cadence.',
    'Break the core argument into channel-native posts, newsletter sections, talking points, and follow-up prompts.',
    'A weekly queue of distribution-ready founder-led content assets.',
    'Partially. Software can package and route the idea; founder taste remains critical.',
    'A compact content operations tool for turning original founder thinking into repeatable distribution assets.',
    false
  )
on conflict (title) do update set
  related_strategy_id = excluded.related_strategy_id,
  pain_frequency = excluded.pain_frequency,
  software_replaceability = excluded.software_replaceability,
  willingness_to_pay = excluded.willingness_to_pay,
  composability = excluded.composability,
  input_text = excluded.input_text,
  action_text = excluded.action_text,
  output_text = excluded.output_text,
  software_ownable = excluded.software_ownable,
  product_brief = excluded.product_brief,
  shortlisted = excluded.shortlisted;

insert into atomic_process_business_models (atomic_process_id, business_model_id)
select ap.id, bm.id
from atomic_processes ap
join (
  values
    ('Trigger-Based ICP Account List Builder', 'SaaS & Software'),
    ('Trigger-Based ICP Account List Builder', 'Traditional B2B Product'),
    ('Trigger-Based ICP Account List Builder', 'Infrastructure & Logistics'),
    ('Review Request Timing Engine', 'Traditional Retail & Local'),
    ('Review Request Timing Engine', 'Healthcare & Wellness'),
    ('Review Request Timing Engine', 'Professional Services'),
    ('Partner Enablement Asset Generator', 'SaaS & Software'),
    ('Partner Enablement Asset Generator', 'Education'),
    ('Partner Enablement Asset Generator', 'Traditional B2B Product'),
    ('Founder POV Repurposing Queue', 'Digital Content'),
    ('Founder POV Repurposing Queue', 'SaaS & Software'),
    ('Founder POV Repurposing Queue', 'Professional Services')
) as rel(process_title, model_title) on rel.process_title = ap.title
join business_models bm on bm.title = rel.model_title
on conflict (atomic_process_id, business_model_id) do nothing;
