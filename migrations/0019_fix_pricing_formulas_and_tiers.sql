-- Migration 0019: Fix custom print pricing formulas and tune boundary parameters

-- Fix Bug B: Move setup_fee outside quantity multiplier for upload prints
INSERT INTO site_settings (key, value)
VALUES ('custom_pricing_upload_formula', 'Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee)')
ON CONFLICT (key) DO UPDATE
SET value = 'Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee)';

-- Fix Bug A: Include modeling_fee in description/idea prints formula
INSERT INTO site_settings (key, value)
VALUES ('custom_pricing_idea_formula', 'Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee) + modeling_fee')
ON CONFLICT (key) DO UPDATE
SET value = 'Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee) + modeling_fee';

-- Fix Parameter Tweak A: Size preset large hint 20–25 cm (Max Single Print)
INSERT INTO site_settings (key, value)
VALUES ('custom_pricing_size_presets', '[{"id":"palm","name":"Palm","hint":"under 8 cm","cm3":8},{"id":"desk","name":"Desk","hint":"8–15 cm","cm3":28},{"id":"shelf","name":"Shelf","hint":"15–25 cm","cm3":90},{"id":"large","name":"Large","hint":"20–25 cm (Max Single Print)","cm3":220}]')
ON CONFLICT (key) DO UPDATE
SET value = '[{"id":"palm","name":"Palm","hint":"under 8 cm","cm3":8},{"id":"desk","name":"Desk","hint":"8–15 cm","cm3":28},{"id":"shelf","name":"Shelf","hint":"15–25 cm","cm3":90},{"id":"large","name":"Large","hint":"20–25 cm (Max Single Print)","cm3":220}]';

-- Fix Parameter Tweak B: Modeling complexity tiers (basic ₹349, photo ₹699, original ₹1,299)
INSERT INTO site_settings (key, value)
VALUES ('custom_pricing_complexities', '[{"id":"file","name":"I already have a model","fee":0,"note":"You upload an STL or 3MF. We print it."},{"id":"basic","name":"Basic / Small Fix (under 30 mins)","fee":349,"note":"Simple hooks, flat brackets, basic dimensional shapes."},{"id":"photo","name":"Photo / Sketch Reference (Standard)","fee":699,"note":"Enclosures, contoured parts, multi-feature parts."},{"id":"original","name":"Complex Mechanism / From Scratch","fee":1299,"note":"Assemblies, snap-fits, threaded parts, custom functional mechanisms."}]')
ON CONFLICT (key) DO UPDATE
SET value = '[{"id":"file","name":"I already have a model","fee":0,"note":"You upload an STL or 3MF. We print it."},{"id":"basic","name":"Basic / Small Fix (under 30 mins)","fee":349,"note":"Simple hooks, flat brackets, basic dimensional shapes."},{"id":"photo","name":"Photo / Sketch Reference (Standard)","fee":699,"note":"Enclosures, contoured parts, multi-feature parts."},{"id":"original","name":"Complex Mechanism / From Scratch","fee":1299,"note":"Assemblies, snap-fits, threaded parts, custom functional mechanisms."}]';

-- Fix Parameter Tweak C: Add 4th infill tier Solid / Heavy Duty (70%–100%) @ 1.65 multiplier
INSERT INTO site_settings (key, value)
VALUES ('custom_pricing_infills', '[{"id":"light","name":"Light · 15%","mult":0.85,"note":"Decorative pieces and light holders."},{"id":"standard","name":"Standard · 20%","mult":1,"note":"Everyday strength. Our default."},{"id":"sturdy","name":"Sturdy · 40%","mult":1.3,"note":"Hooks, stands, anything that takes weight."},{"id":"solid","name":"Solid / Heavy Duty (70%–100%)","mult":1.65,"note":"Extreme strength, gears, motor mounts, structural brackets."}]')
ON CONFLICT (key) DO UPDATE
SET value = '[{"id":"light","name":"Light · 15%","mult":0.85,"note":"Decorative pieces and light holders."},{"id":"standard","name":"Standard · 20%","mult":1,"note":"Everyday strength. Our default."},{"id":"sturdy","name":"Sturdy · 40%","mult":1.3,"note":"Hooks, stands, anything that takes weight."},{"id":"solid","name":"Solid / Heavy Duty (70%–100%)","mult":1.65,"note":"Extreme strength, gears, motor mounts, structural brackets."}]';
