-- The catalogue at launch (step 6.1, M23): the five classes, the seven applications and the categories the design
-- names (Systems class page 391:4379, marketplace landing 390:7501), with the one attribute schema the design draws:
-- Systems › Compression systems › Diaphragm (636:596). Not sample data: the founder chose to launch with these (M23).
-- Everything else is added by operators in admin Catalogue. Counts in the frames are sample and are not stored.
INSERT INTO "core"."catalogue_classes" ("id", "label", "description", "position") VALUES
  ('systems', 'Systems', 'Electrolysers, fuel cell systems, compression, refuelling and storage systems.', 1),
  ('components', 'Components', 'Stacks, valves, sensors, fittings, tanks and power electronics.', 2),
  ('equipment', 'Equipment', 'Manufacturing lines, test benches, safety and measuring equipment.', 3),
  ('services', 'Services', 'EPC, engineering, testing and certification, O&M and compliance support.', 4),
  ('materials', 'Materials', 'Catalysts, membranes, transport layers, coatings and seals.', 5);
--> statement-breakpoint
-- Labels as on the landing (390:7668); short labels and examples as on the home tiles (850:209). Ports and shipping has
-- no home tile, so it starts hidden until the founder switches it on (step 6.1 answer).
INSERT INTO "core"."catalogue_applications" ("id", "label", "short_label", "examples", "position", "hidden_at") VALUES
  ('production', 'Green hydrogen production', 'Production', 'Electrolysers, BoP, water', 1, NULL),
  ('storage-transport', 'Storage & transport', 'Storage & transport', 'Tanks, cylinders, trailers', 2, NULL),
  ('refuelling-mobility', 'Refuelling & mobility', 'Refuelling & mobility', 'Compressors, dispensers', 3, NULL),
  ('fuel-cells-power', 'Fuel cells for power', 'Fuel cells & power', 'Stacks, systems, backup', 4, NULL),
  ('industrial-use', 'Industrial decarbonisation', 'Industrial use', 'Ammonia, steel, refining', 5, NULL),
  ('ports-shipping', 'Ports & shipping', 'Ports & shipping', '', 6, now()),
  ('safety-testing', 'Safety & testing', 'Safety & testing', 'Sensors, valves, labs', 7, NULL);
--> statement-breakpoint
INSERT INTO "core"."catalogue_categories" ("id", "class_id", "parent_id", "slug", "label", "position") VALUES
  ('01a1d349-7bc1-7aef-854c-7e665f235529', 'systems', NULL, 'electrolysers', 'Electrolysers', 1),
  ('01a1d349-7bc2-7ac1-bffc-8a744051c033', 'systems', NULL, 'fuel-cell-systems', 'Fuel cell systems', 2),
  ('01a1d349-7bc2-7ac1-bffc-8a7502a1eb12', 'systems', NULL, 'compression-systems', 'Compression systems', 3),
  ('01a1d349-7bc2-7ac1-bffc-8a766b62de5d', 'systems', NULL, 'refuelling-stations-modules', 'Refuelling stations & modules', 4),
  ('01a1d349-7bc2-7ac1-bffc-8a771e9ebedf', 'systems', NULL, 'dispensers', 'Dispensers', 5),
  ('01a1d349-7bc2-7ac1-bffc-8a7815555da5', 'systems', NULL, 'storage-systems', 'Storage systems', 6),
  ('01a1d349-7bc2-7ac1-bffc-8a79f6399c5b', 'systems', NULL, 'transport-trailers', 'Transport trailers', 7),
  ('01a1d349-7bc2-7ac1-bffc-8a7a2ed56f1e', 'systems', NULL, 'purification-treatment', 'Purification & treatment', 8),
  ('01a1d349-7bc2-7ac1-bffc-8a7bfe8124cb', 'systems', NULL, 'liquefaction', 'Liquefaction', 9),
  ('01a1d349-7bc2-7ac1-bffc-8a7cd5226dc5', 'systems', NULL, 'hydrogen-generators', 'Hydrogen generators', 10),
  ('01a1d349-7bc2-7ac1-bffc-8a7d49ee833e', 'systems', NULL, 'power-conversion-rectifiers', 'Power conversion & rectifiers', 11),
  ('01a1d349-7bc2-7ac1-bffc-8a7edc56b227', 'systems', NULL, 'chp-units', 'CHP units', 12),
  ('01a1d349-7bc2-7ac1-bffc-8a7f02c77388', 'components', NULL, 'tanks-cylinders', 'Tanks & cylinders', 1),
  ('01a1d349-7bc2-7ac1-bffc-8a801559928d', 'components', NULL, 'valves-regulators', 'Valves & regulators', 2),
  ('01a1d349-7bc2-7ac1-bffc-8a81d6e33189', 'components', NULL, 'sensors-detectors', 'Sensors & detectors', 3),
  ('01a1d349-7bc2-7ac1-bffc-8a826c493d2f', 'services', NULL, 'testing-certification', 'Testing & certification', 1),
  ('01a1d349-7bc2-7ac1-bffc-8a83d0f0109d', 'materials', NULL, 'catalysts', 'Catalysts', 1),
  ('01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'systems', '01a1d349-7bc2-7ac1-bffc-8a7502a1eb12', 'diaphragm', 'Diaphragm', 1);
--> statement-breakpoint
-- Comparable is not drawn on 636:596; it starts equal to Filterable and operators change it (step 6.1 answer).
INSERT INTO "core"."catalogue_attributes" ("id", "category_id", "key", "label", "type", "unit", "min", "max", "options", "hint", "required", "filterable", "comparable", "test_condition", "display_group", "position") VALUES
  ('01a1d349-7bc2-7ac1-bffc-8a85f2eab6e1', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'flow_rate', 'Flow rate', 'number', 'Nm³/h', 1, 5000, '{}', NULL, true, true, true, 'At suction pressure', 'Performance', 1),
  ('01a1d349-7bc3-744d-9404-2a6d1c84fb58', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'suction_pressure', 'Suction pressure', 'range', 'bar g', 0, 200, '{}', NULL, true, true, true, NULL, 'Performance', 2),
  ('01a1d349-7bc3-744d-9404-2a6e675bcea4', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'discharge_pressure', 'Discharge pressure', 'number', 'bar g', 50, 1000, '{}', NULL, true, true, true, NULL, 'Performance', 3),
  ('01a1d349-7bc3-744d-9404-2a6f9dbec776', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'motor_power', 'Motor power', 'number', 'kW', 1, 2000, '{}', NULL, true, false, false, NULL, 'Performance', 4),
  ('01a1d349-7bc3-744d-9404-2a7098ecc4c1', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'hydrogen_purity', 'Hydrogen purity', 'number', '%', 99, 99.9999, '{}', NULL, true, true, true, 'Measured at outlet', 'Gas quality', 5),
  ('01a1d349-7bc3-744d-9404-2a71bc692ec4', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'lubrication', 'Lubrication', 'choice', NULL, NULL, NULL, '{Oil-free,Oil-lubricated}', NULL, true, true, true, NULL, 'Gas quality', 6),
  ('01a1d349-7bc3-744d-9404-2a728cf8b256', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'cooling', 'Cooling', 'choice', NULL, NULL, NULL, '{Water,Air}', NULL, false, true, true, NULL, 'Physical', 7),
  ('01a1d349-7bc3-744d-9404-2a73fb68935e', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'weight', 'Weight', 'number', 'kg', 10, 50000, '{}', NULL, false, false, false, NULL, 'Physical', 8),
  ('01a1d349-7bc3-744d-9404-2a74e86f3498', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'footprint', 'Footprint', 'text', 'm', NULL, NULL, '{}', 'L × W', false, false, false, NULL, 'Physical', 9),
  ('01a1d349-7bc3-744d-9404-2a750b4971e3', '01a1d349-7bc2-7ac1-bffc-8a84ac624467', 'noise_level', 'Noise level', 'number', 'dB(A)', 40, 110, '{}', NULL, false, false, false, 'At 1 m', 'Physical', 10);
