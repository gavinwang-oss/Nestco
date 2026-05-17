// Run with: node scripts/seed.js
// Seeds 25 listings + 10 requests owned by developer@nestco.edu

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const OWNER_EMAIL = "developer@nestco.edu";

// Realistic Berkeley-area addresses
const addresses = [
  "2547 Channing Way, Berkeley, CA 94704",
  "2210 Telegraph Ave, Berkeley, CA 94704",
  "2438 Haste St, Berkeley, CA 94704",
  "2350 Durant Ave, Berkeley, CA 94704",
  "2600 Dwight Way, Berkeley, CA 94704",
  "1850 Euclid Ave, Berkeley, CA 94709",
  "2415 Bowditch St, Berkeley, CA 94704",
  "1920 Dana St, Berkeley, CA 94709",
  "2120 Fulton St, Berkeley, CA 94709",
  "2700 Bancroft Way, Berkeley, CA 94704",
  "2301 College Ave, Berkeley, CA 94704",
  "1730 Le Roy Ave, Berkeley, CA 94709",
  "2501 Piedmont Ave, Berkeley, CA 94704",
  "2068 Addison St, Berkeley, CA 94704",
  "1600 Milvia St, Berkeley, CA 94709",
  "2900 Telegraph Ave, Berkeley, CA 94705",
  "2810 Benvenue Ave, Berkeley, CA 94705",
  "2635 Regent St, Berkeley, CA 94704",
  "1950 Shattuck Ave, Berkeley, CA 94704",
  "2450 Martin Luther King Jr Way, Berkeley, CA 94704",
  "2755 Hillegass Ave, Berkeley, CA 94705",
  "2108 Dwight Way, Berkeley, CA 94704",
  "1840 Spruce St, Berkeley, CA 94709",
  "2320 Warring St, Berkeley, CA 94704",
  "2580 Parker St, Berkeley, CA 94704",
];

const types = [
  "Private Room",
  "Private Room",
  "Private Room",
  "Shared Room",
  "Entire Studio",
  "Entire Studio",
  "Entire 1BR",
  "Entire 1BR",
  "Entire 2BR",
];

const descriptions = [
  "Bright and airy private room in a 4-bed house. Shared kitchen, living room, and two bathrooms. Quiet neighborhood, great for studying. 10-min walk to campus.",
  "Cozy studio apartment, fully furnished. In-unit laundry, modern kitchen, hardwood floors. Super close to the Southside cafes and campus.",
  "Private room in a modern apartment shared with two other grad students. High-speed WiFi, clean shared spaces, dedicated desk area included.",
  "Charming 1BR in a Victorian building near Northside. Walk to campus in 15 minutes. Exposed brick, tall ceilings, tons of character.",
  "Shared room in a 6-person co-op style house. Huge common areas, weekly house dinners, bike storage. Very social vibe — perfect if you want community.",
  "Entire 2BR apartment available for sublet. Ideal for two friends subletting together. Sunny, south-facing, close to BART.",
  "Furnished studio on Telegraph. Steps from restaurants, cafes, and the Regal Cinema. Utilities included. Perfect for a single student.",
  "Private room in a quiet 3-bed flat near Elmwood. Backyard access, off-street parking, washer/dryer in unit.",
  "Spacious 1BR near Shattuck Ave. Updated kitchen, new appliances, building has a rooftop deck. 12 min walk to campus.",
  "Private room with en-suite bathroom — rare find in Berkeley. Shared with one other student. Very clean, minimal, peaceful.",
  "Ground-floor studio with private entrance, small patio, and updated bath. Pets welcome. Quiet residential block.",
  "Modern 2BR with two full baths. Ideal for two people. Open floor plan, dishwasher, in-unit laundry. Close to the Graduate Theological Union.",
  "Furnished private room in a 5-person house with a great social dynamic. Weekly cleaners, fast internet, big kitchen.",
  "Cute Northside studio. Very quiet, excellent for studying. Hardwood floors, large closets, natural light. 15-min walk to campus.",
  "Private room in a newly renovated townhouse. Large backyard, two-car garage (one spot included), high ceilings.",
  "Entire 1BR sublet while owner is abroad for a semester. All furniture included, smart TV, high-speed internet.",
  "Shared room in an intentional living house near campus. Organic garden, rotating chef duties, high community involvement.",
  "Top-floor private room with hillside views. Quiet, secure building with elevator. 20-min walk to campus or quick bus ride.",
  "Affordable private room near Downtown Berkeley BART. Great transit access, nearby grocery stores, laundromat on block.",
  "Sunny 2BR with dedicated home office space — great if both roommates are working remotely or studying heavily.",
  "Studio apartment in a newer building. Gym access, package locker, bike room. A bit further from campus but great amenities.",
  "Charming private room in a Craftsman bungalow. Three housemates, all grad students. Dogs welcome.",
  "Entire studio, no roommates. Perfect for an introvert or someone who values quiet. Utilities included, fully furnished.",
  "Private room in a newly renovated duplex. Brand new kitchen, bathroom, in-unit washer/dryer. Parking available for extra $100/month.",
  "Large shared room in a friendly 4-person house. Split the rent affordably. Living room, backyard, communal dinners some nights.",
];

const genderPrefs = ["Any", "Any", "Any", "Female", "Male", "Any", "Female"];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(truePct = 0.5) {
  return Math.random() < truePct;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const today = new Date().toISOString().split("T")[0];

function makeListings(userId) {
  return addresses.map((address, i) => {
    const type = randomElement(types);
    const isShared = type === "Shared Room";
    const isEntire = type.startsWith("Entire");

    const fromOffset = randomInt(0, 60);
    const available_from = addDays(today, fromOffset);
    const available_to = addDays(available_from, randomInt(60, 180));

    let price;
    if (isShared) price = randomInt(700, 1000);
    else if (type === "Private Room") price = randomInt(1000, 1600);
    else if (type === "Entire Studio") price = randomInt(1400, 2000);
    else if (type === "Entire 1BR") price = randomInt(1800, 2600);
    else price = randomInt(2400, 3600);

    const num_roommates = isEntire ? 0 : isShared ? randomInt(3, 7) : randomInt(1, 4);

    return {
      user_id: userId,
      address,
      type,
      price,
      utilities_included: randomBool(0.4),
      available_from,
      available_to,
      furnished: randomBool(0.6),
      parking: randomBool(0.3),
      pets: randomBool(0.25),
      smokers: false,
      gender_preference: randomElement(genderPrefs),
      num_roommates,
      roommate_genders: num_roommates > 0 ? randomElement(["Mixed", "All female", "All male", "Mixed"]) : null,
      roommate_age_min: num_roommates > 0 ? randomInt(18, 20) : null,
      roommate_age_max: num_roommates > 0 ? randomInt(24, 28) : null,
      dwinelle_distance: randomInt(5, 25),
      description: descriptions[i % descriptions.length],
      photos: [],
    };
  });
}

const requestDescriptions = [
  "Looking for a private room near campus starting in June. I'm a junior studying CS, very clean and quiet. Prefer no smoking.",
  "Two friends looking for a 2BR apartment together for the summer. Budget is $1400/person. We're both grad students, very responsible.",
  "Seeking a furnished studio or 1BR for a visiting researcher staying through December. Flexible on price within budget.",
  "Female senior looking for a room in an all-female or mixed household. Non-smoker, have a small cat.",
  "Incoming transfer student looking for a private room close to Northside starting August. First time in Berkeley!",
  "Grad student looking for a quiet, furnished private room. Work from home so need good WiFi and a desk setup.",
  "Looking for a shared room to save money. Happy to room with 2-3 others. Super easygoing and social.",
  "Need a place for the summer only (May-August). Any type is fine, furnished preferred. Don't need parking.",
  "Junior studying architecture, looking for a creative/artsy house with like-minded people. Northside or Elmwood preferred.",
  "International student arriving in September, looking for a furnished room close to campus. Budget around $1200/month.",
];

function makeRequests(userId, userEmail) {
  const roomTypeOptions = [
    ["Private Room"],
    ["Private Room", "Entire Studio"],
    ["Entire 1BR", "Entire 2BR"],
    ["Shared Room", "Private Room"],
    ["Entire Studio"],
    ["Private Room"],
    ["Shared Room"],
    ["Private Room", "Entire Studio", "Entire 1BR"],
    ["Private Room"],
    ["Private Room", "Entire Studio"],
  ];

  return requestDescriptions.map((description, i) => {
    const fromOffset = randomInt(0, 45);
    const available_from = addDays(today, fromOffset);

    return {
      user_id: userId,
      user_email: userEmail,
      description,
      max_price: randomInt(900, 2200),
      room_types: roomTypeOptions[i],
      gender_preference: randomElement(["Any", "Any", "Any", "Female", "Male"]),
      furnished: randomBool(0.5),
      utilities_included: randomBool(0.3),
      available_from,
      max_walk_minutes: randomInt(10, 25),
      pets: i === 3,
      is_active: true,
      expires_at: addDays(today, 60),
    };
  });
}

async function main() {
  // Look up the developer user
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const dev = users.find((u) => u.email === OWNER_EMAIL);
  if (!dev) throw new Error(`User ${OWNER_EMAIL} not found. Make sure they exist in Supabase auth.`);

  console.log(`Found user: ${dev.email} (${dev.id})`);

  // Insert listings
  const listings = makeListings(dev.id);
  const { data: insertedListings, error: listingErr } = await supabase
    .from("listings")
    .insert(listings)
    .select("id");

  if (listingErr) throw listingErr;
  console.log(`Inserted ${insertedListings.length} listings.`);

  // Insert requests
  const requests = makeRequests(dev.id, dev.email);
  const { data: insertedRequests, error: requestErr } = await supabase
    .from("requests")
    .insert(requests)
    .select("id");

  if (requestErr) throw requestErr;
  console.log(`Inserted ${insertedRequests.length} requests.`);

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
