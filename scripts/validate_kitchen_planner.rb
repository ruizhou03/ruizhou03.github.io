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
  walmart = item["walmart"]
  next unless walmart

  errors << "catalog #{id}: Walmart label missing" if walmart["label"].to_s.strip.empty?
  errors << "catalog #{id}: Walmart URL must be HTTPS walmart.com" unless walmart["url"].to_s.match?(%r{\Ahttps://www\.walmart\.com/})
  if walmart.key?("package_qty")
    errors << "catalog #{id}: invalid package_qty" unless walmart["package_qty"].is_a?(Numeric) && walmart["package_qty"].positive?
    errors << "catalog #{id}: invalid package_unit" unless VALID_UNITS.include?(walmart["package_unit"])
  end
end

planner_count = 0
Dir.glob(RECIPE_GLOB).sort.each do |path|
  data = front_matter(path)
  next unless data["planner_enabled"] == true

  planner_count += 1
  slug = data["slug"] || File.basename(path)
  errors << "#{slug}: servings_base must be 1" unless data["servings_base"] == 1
  tasks = data["prep_tasks"]
  errors << "#{slug}: prep_tasks missing" unless tasks.is_a?(Array) && tasks.any? && tasks.all? { |task| task.is_a?(String) && !task.strip.empty? }
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
end

errors << "expected 6 planner recipes, found #{planner_count}" unless planner_count == 6

if errors.any?
  warn errors.join("\n")
  exit 1
end

puts "Kitchen planner data valid: #{planner_count} recipes, #{catalog.length} canonical ingredients"
