-- Group wiki sections by business. Each business gets its own set of the six
-- SOP categories; the sidebar shows businesses as collapsible groups.

alter table wiki_sections add column if not exists business text not null default '';

-- The original generic sections become Biodegradable Golf Balls' set,
-- ordered after the other two businesses (Nonna 0-5, CGBP 10-15, BGB 20-25).
update wiki_sections
set business = 'Biodegradable Golf Balls', sort_order = sort_order + 20
where business = '';

-- Add the six categories for the other two businesses, per organization.
insert into wiki_sections (organization_id, name, slug, sort_order, business)
select o.id, c.name, b.prefix || '-' || c.slug, b.ord + c.sort_order, b.business
from organizations o
cross join (
  values
    ('The Nonna', 'nonna', 0),
    ('Custom Golf Ball Printing', 'custom-golf-ball-printing', 10)
) as b(business, prefix, ord)
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

-- Re-home docs that clearly belong to Custom Golf Ball Printing (the one
-- existing SOP mentions it in the title) into that business's same category.
update wiki_docs d
set section_id = s_new.id
from wiki_sections s_old
join wiki_sections s_new
  on s_new.organization_id = s_old.organization_id
  and s_new.business = 'Custom Golf Ball Printing'
  and s_new.slug = 'custom-golf-ball-printing-' || s_old.slug
where d.section_id = s_old.id
  and s_old.business = 'Biodegradable Golf Balls'
  and d.title ilike '%custom golf ball printing%';
