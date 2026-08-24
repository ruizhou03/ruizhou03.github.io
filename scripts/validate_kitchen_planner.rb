#!/usr/bin/env ruby

require "date"
require "yaml"

ROOT = File.expand_path("..", __dir__)
CATALOG_PATH = File.join(ROOT, "_data", "kitchen_ingredients.yml")
RECIPE_GLOB = File.join(ROOT, "_notes", "life", "recipes", "*.md")
VALID_MODES = %w[fresh pantry packaged exclude].freeze
VALID_UNITS = %w[g ml each].freeze

def front_matter(path)
  content = File.read(path, encoding: "UTF-8")
  match = content.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  raise "#{path}: missing front matter" unless match

  YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
end

catalog = YAML.safe_load(File.read(CATALOG_PATH, encoding: "UTF-8"), aliases: true) || {}
errors = []

catalog.each do |id, item|
  errors << "catalog #{id}: invalid id" unless id.match?(/\A[a-z][a-z0-9_]*\z/)
  errors << "catalog #{id}: missing label" if item["label"].to_s.strip.empty?
  errors << "catalog #{id}: invalid purchase_mode" unless VALID_MODES.include?(item["purchase_mode"])
  if item["category"] == "meat"
    errors << "catalog #{id}: safety_class missing" unless %w[raw_beef raw_poultry raw_meat].include?(item["safety_class"])
  end
  walmart = item["walmart"]
  next unless walmart

  errors << "catalog #{id}: Walmart label missing" if walmart["label"].to_s.strip.empty?
  errors << "catalog #{id}: Walmart URL must be HTTPS walmart.com" unless walmart["url"].to_s.match?(%r{\Ahttps://www\.walmart\.com/})
  if walmart.key?("package_qty")
    errors << "catalog #{id}: invalid package_qty" unless walmart["package_qty"].is_a?(Numeric) && walmart["package_qty"].positive?
    errors << "catalog #{id}: invalid package_unit" unless VALID_UNITS.include?(walmart["package_unit"])
  end
  if %w[pantry packaged].include?(item["purchase_mode"])
    errors << "catalog #{id}: Walmart unit_label missing" if walmart["unit_label"].to_s.strip.empty?
  end
end

planner_count = 0
Dir.glob(RECIPE_GLOB).sort.each do |path|
  data = front_matter(path)
  next unless data["planner_enabled"] == true

  planner_count += 1
  slug = data["slug"] || File.basename(path)
  errors << "#{slug}: servings_base must be 1" unless data["servings_base"] == 1
  prep = data["planner_prep"]
  errors << "#{slug}: planner_prep missing" unless prep.is_a?(Hash)
  errors << "#{slug}: cook_priority missing" unless data["cook_priority"].is_a?(Numeric)
  errors << "#{slug}: cook_note missing" if data["cook_note"].to_s.strip.empty?
  errors << "#{slug}: cooking steps missing" unless data["steps"].is_a?(Array) && data["steps"].any?
  workflow = data["workflow"]
  errors << "#{slug}: workflow missing" unless workflow.is_a?(Array) && workflow.any?
  ingredients = data["ingredients"]
  unless ingredients.is_a?(Array) && ingredients.any?
    errors << "#{slug}: ingredients missing"
    next
  end

  units_by_id = {}
  ingredients.each_with_index do |ingredient, index|
    prefix = "#{slug}: ingredient #{index + 1}"
    id = ingredient["id"]
    qty = ingredient["qty"]
    unit = ingredient["unit"]
    errors << "#{prefix}: unknown id #{id.inspect}" unless catalog.key?(id)
    errors << "#{prefix}: qty must be positive numeric" unless qty.is_a?(Numeric) && qty.positive?
    errors << "#{prefix}: invalid unit #{unit.inspect}" unless VALID_UNITS.include?(unit)
    errors << "#{prefix}: display amount missing" if ingredient["amount"].to_s.strip.empty?
    if units_by_id.key?(id) && units_by_id[id] != unit
      errors << "#{slug}: #{id} mixes #{units_by_id[id]} and #{unit}"
    end
    units_by_id[id] = unit
  end

  next unless prep.is_a?(Hash)

  %w[produce mixes proteins].each do |section|
    errors << "#{slug}: planner_prep.#{section} missing" unless prep[section].is_a?(Array) && prep[section].any?
  end
  (prep["produce"] || []).each_with_index do |task, index|
    errors << "#{slug}: produce #{index + 1} unknown id" unless catalog.key?(task["id"])
    errors << "#{slug}: produce #{index + 1} action missing" if task["action"].to_s.strip.empty?
  end
  (prep["mixes"] || []).each_with_index do |mix, index|
    errors << "#{slug}: mix #{index + 1} name missing" if mix["name"].to_s.strip.empty?
    errors << "#{slug}: mix #{index + 1} action missing" if mix["action"].to_s.strip.empty?
    components = mix["components"]
    unless components.is_a?(Array) && components.any?
      errors << "#{slug}: mix #{index + 1} components missing"
      next
    end
    components.each_with_index do |component, component_index|
      prefix = "#{slug}: mix #{index + 1} component #{component_index + 1}"
      errors << "#{prefix} unknown id" unless catalog.key?(component["id"])
      errors << "#{prefix} invalid qty" unless component["qty"].is_a?(Numeric) && component["qty"].positive?
      errors << "#{prefix} invalid unit" unless VALID_UNITS.include?(component["unit"])
    end
  end
  (prep["proteins"] || []).each_with_index do |protein, index|
    prefix = "#{slug}: protein #{index + 1}"
    errors << "#{prefix} unknown id" unless catalog.key?(protein["id"])
    errors << "#{prefix} cut missing" if protein["cut"].to_s.strip.empty?
    errors << "#{prefix} action missing" if protein["action"].to_s.strip.empty?
    errors << "#{prefix} marinade_minutes invalid" unless protein["marinade_minutes"].is_a?(Numeric) && protein["marinade_minutes"].positive?
    marinade = protein["marinade"]
    unless marinade.is_a?(Array) && marinade.any?
      errors << "#{prefix} marinade missing"
      next
    end
    marinade.each_with_index do |component, component_index|
      component_prefix = "#{prefix} marinade #{component_index + 1}"
      errors << "#{component_prefix} unknown id" unless catalog.key?(component["id"])
      errors << "#{component_prefix} invalid qty" unless component["qty"].is_a?(Numeric) && component["qty"].positive?
      errors << "#{component_prefix} invalid unit" unless VALID_UNITS.include?(component["unit"])
    end
  end

  next unless workflow.is_a?(Array) && workflow.any?

  workflow_ids = workflow.map { |task| task["id"] }
  errors << "#{slug}: workflow task ids must be unique" unless workflow_ids.compact.uniq.length == workflow.length
  workflow.each_with_index do |task, index|
    prefix = "#{slug}: workflow #{index + 1}"
    errors << "#{prefix} id invalid" unless task["id"].to_s.match?(/\A[a-z][a-z0-9_-]*\z/)
    errors << "#{prefix} label missing" if task["label"].to_s.strip.empty?
    errors << "#{prefix} kind missing" if task["kind"].to_s.strip.empty?
    active = task["active_min"]
    passive = task["passive_min"]
    valid_active = active.is_a?(Numeric) && active.positive?
    valid_passive = passive.is_a?(Numeric) && passive.positive?
    errors << "#{prefix} duration missing" unless valid_active || valid_passive
    resources = Array(task["resources_active"]) + Array(task["resources_passive"])
    errors << "#{prefix} resources missing" if resources.empty?
    Array(task["depends_on"]).each do |dependency|
      errors << "#{prefix} unknown dependency #{dependency}" unless workflow_ids.include?(dependency)
    end
    if task.key?("batch_capacity_g")
      errors << "#{prefix} batch ingredient missing" unless catalog.key?(task["batch_ingredient_id"])
      errors << "#{prefix} batch capacity invalid" unless task["batch_capacity_g"].is_a?(Numeric) && task["batch_capacity_g"].positive?
    end
    if task["finish"] == true
      errors << "#{prefix} hold_max_min invalid" unless task["hold_max_min"].is_a?(Numeric) && task["hold_max_min"] >= 0
      errors << "#{prefix} quality_penalty invalid" unless task["quality_penalty"].is_a?(Numeric) && task["quality_penalty"] >= 0
    end
  end
  errors << "#{slug}: workflow must contain one finish task" unless workflow.count { |task| task["finish"] == true } == 1
end

errors << "expected 6 planner recipes, found #{planner_count}" unless planner_count == 6

if errors.any?
  warn errors.join("\n")
  exit 1
end

puts "Kitchen planner data valid: #{planner_count} recipes, #{catalog.length} canonical ingredients"
