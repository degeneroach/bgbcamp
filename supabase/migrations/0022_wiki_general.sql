-- "General" wiki business group, ordered before The Nonna (which starts at
-- sort_order 0 — negative orders put General first).

insert into wiki_sections (organization_id, name, slug, sort_order, business)
select o.id, c.name, 'general-' || c.slug, -10 + c.sort_order, 'General'
from organizations o
cross join (
  values
    ('Onboarding', 'onboarding', 0),
    ('Daily Operations', 'daily-operations', 1),
    ('Weekly Operations', 'weekly-operations', 2),
    ('Monthly Operations', 'monthly-operations', 3),
    ('Customer Service', 'customer-service', 4),
    ('Reference', 'reference', 5)
) as c(name, slug, sort_order)
on conflict (organization_id, slug) do nothing;
