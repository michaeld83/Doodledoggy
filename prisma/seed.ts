import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const libsqlAdapter = require("@prisma/adapter-libsql") as {
      PrismaLibSql?: new (client: unknown) => unknown;
      PrismaLibSQL?: new (client: unknown) => unknown;
    };
    const Adapter = libsqlAdapter.PrismaLibSql || libsqlAdapter.PrismaLibSQL;
    if (!Adapter) throw new Error("Turso adapter not available");
    const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
    return new PrismaClient({ adapter: new Adapter(libsql) as never });
  }
  return new PrismaClient();
}

const prisma = createPrismaClient();

async function main() {
  console.log("Seeding Doodledoggy...");

  await prisma.inquiry.deleteMany();
  await prisma.matingCoiCheck.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.puppy.deleteMany();
  await prisma.litter.deleteMany();
  await prisma.healthRecord.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSetting.deleteMany();

  const hash = await bcrypt.hash("doodle2024!", 10);

  await prisma.user.createMany({
    data: [
      {
        email: "michael@doodledoggy.local",
        name: "Michael",
        passwordHash: hash,
      },
      {
        email: "partner@doodledoggy.local",
        name: "Partner",
        passwordHash: hash,
      },
    ],
  });

  await prisma.appSetting.createMany({
    data: [
      { key: "coi_warn_threshold", value: "6.25" },
      { key: "coi_common_ancestor_gens", value: "4" },
      { key: "kennel_name", value: "Mini Golden Doodles Georgia" },
    ],
  });

  // Generation 3 (great-grandparents / foundation)
  const g3 = await Promise.all([
    prisma.dog.create({
      data: {
        registeredName: "Sunnybrook Golden Ace",
        callName: "Ace",
        sex: "MALE",
        breed: "Golden Retriever",
        dateOfBirth: new Date("2016-03-12"),
        status: "RETIRED",
        registration: "AKC-GR-1001",
        notes: "Foundation golden sire line",
      },
    }),
    prisma.dog.create({
      data: {
        registeredName: "Sunnybrook Honey Belle",
        callName: "Belle",
        sex: "FEMALE",
        breed: "Golden Retriever",
        dateOfBirth: new Date("2016-05-20"),
        status: "RETIRED",
        registration: "AKC-GR-1002",
      },
    }),
    prisma.dog.create({
      data: {
        registeredName: "Willowcreek Poodle Prestige",
        callName: "Prestige",
        sex: "MALE",
        breed: "Miniature Poodle",
        dateOfBirth: new Date("2015-11-08"),
        status: "RETIRED",
        registration: "AKC-PO-2001",
      },
    }),
    prisma.dog.create({
      data: {
        registeredName: "Willowcreek Pearl Whisper",
        callName: "Pearl",
        sex: "FEMALE",
        breed: "Miniature Poodle",
        dateOfBirth: new Date("2016-01-15"),
        status: "RETIRED",
        registration: "AKC-PO-2002",
      },
    }),
    prisma.dog.create({
      data: {
        registeredName: "Cedarlane Golden Duke",
        callName: "Duke",
        sex: "MALE",
        breed: "Golden Retriever",
        dateOfBirth: new Date("2017-02-01"),
        status: "RETIRED",
        registration: "AKC-GR-1101",
      },
    }),
    prisma.dog.create({
      data: {
        registeredName: "Cedarlane Soft Apricot",
        callName: "Apricot",
        sex: "FEMALE",
        breed: "Miniature Poodle",
        dateOfBirth: new Date("2017-04-18"),
        status: "RETIRED",
        registration: "AKC-PO-2101",
      },
    }),
    // Extra foundation used to create relatedness for COI demos
    prisma.dog.create({
      data: {
        registeredName: "Sunnybrook Golden Ace II",
        callName: "Ace Jr Line",
        sex: "MALE",
        breed: "Golden Retriever",
        dateOfBirth: new Date("2014-08-01"),
        status: "DECEASED",
        notes: "Shared distant ancestor for COI demo",
      },
    }),
  ]);

  const [ace, belle, prestige, pearl, duke, apricot, aceLine] = g3;

  // Link Ace's father to Ace Line for deeper pedigree
  await prisma.dog.update({
    where: { id: ace.id },
    data: { fatherId: aceLine.id },
  });

  // Generation 2 (grandparents / F1 doodles & purebreds)
  const maple = await prisma.dog.create({
    data: {
      registeredName: "MGGA Maple Sugar F1",
      callName: "Maple",
      sex: "FEMALE",
      breed: "Mini Golden Doodle F1",
      dateOfBirth: new Date("2019-06-10"),
      status: "ACTIVE",
      microchip: "985112000000001",
      registration: "MGGA-F1-001",
      motherId: belle.id,
      fatherId: prestige.id,
      notes: "Active breeding dam — cream coat",
    },
  });

  const oak = await prisma.dog.create({
    data: {
      registeredName: "MGGA Oakridge F1",
      callName: "Oak",
      sex: "MALE",
      breed: "Mini Golden Doodle F1",
      dateOfBirth: new Date("2019-08-22"),
      status: "ACTIVE",
      microchip: "985112000000002",
      registration: "MGGA-F1-002",
      motherId: pearl.id,
      fatherId: ace.id,
      notes: "Active stud — apricot",
    },
  });

  const willow = await prisma.dog.create({
    data: {
      registeredName: "MGGA Willow Breeze F1",
      callName: "Willow",
      sex: "FEMALE",
      breed: "Mini Golden Doodle F1",
      dateOfBirth: new Date("2020-03-05"),
      status: "ACTIVE",
      microchip: "985112000000003",
      motherId: apricot.id,
      fatherId: duke.id,
      notes: "Active dam — light red",
    },
  });

  const cedar = await prisma.dog.create({
    data: {
      registeredName: "MGGA Cedar Twist F1B",
      callName: "Cedar",
      sex: "MALE",
      breed: "Mini Golden Doodle F1B",
      dateOfBirth: new Date("2020-01-14"),
      status: "ACTIVE",
      microchip: "985112000000004",
      motherId: maple.id,
      fatherId: prestige.id, // backcross — shares Prestige with Maple's father
      notes: "F1B stud — useful for COI warning demos vs Maple's line",
    },
  });

  // Generation 1 (current generation offspring)
  const honey = await prisma.dog.create({
    data: {
      registeredName: "MGGA Honey Peach F1B",
      callName: "Honey",
      sex: "FEMALE",
      breed: "Mini Golden Doodle F1B",
      dateOfBirth: new Date("2022-09-18"),
      status: "ACTIVE",
      microchip: "985112000000010",
      motherId: maple.id,
      fatherId: oak.id,
      notes: "Kept from Maple x Oak litter",
    },
  });

  const river = await prisma.dog.create({
    data: {
      registeredName: "MGGA River Gold F2",
      callName: "River",
      sex: "MALE",
      breed: "Mini Golden Doodle F2",
      dateOfBirth: new Date("2023-04-02"),
      status: "ACTIVE",
      microchip: "985112000000011",
      motherId: willow.id,
      fatherId: oak.id,
    },
  });

  const luna = await prisma.dog.create({
    data: {
      registeredName: "MGGA Luna Cream F1B",
      callName: "Luna",
      sex: "FEMALE",
      breed: "Mini Golden Doodle F1B",
      dateOfBirth: new Date("2023-11-20"),
      status: "ACTIVE",
      motherId: willow.id,
      fatherId: cedar.id,
    },
  });

  // Litter: Maple x Oak (historical, with puppies)
  const litter1 = await prisma.litter.create({
    data: {
      name: "Maple x Oak — Fall 2022",
      damId: maple.id,
      sireId: oak.id,
      whelpDate: new Date("2022-09-18"),
      status: "CLOSED",
      notes: "First MGGA F1B litter",
    },
  });

  await prisma.puppy.createMany({
    data: [
      {
        litterId: litter1.id,
        tempName: "Honey",
        sex: "FEMALE",
        color: "Cream",
        status: "KEPT",
        pickPosition: 1,
        dogId: honey.id,
      },
      {
        litterId: litter1.id,
        tempName: "Butterscotch",
        sex: "MALE",
        color: "Apricot",
        status: "SOLD",
        pickPosition: 2,
      },
      {
        litterId: litter1.id,
        tempName: "Caramel",
        sex: "FEMALE",
        color: "Light red",
        status: "SOLD",
        pickPosition: 3,
      },
    ],
  });

  // Upcoming litter: Willow x River (related via Oak — good COI demo)
  const litter2 = await prisma.litter.create({
    data: {
      name: "Willow x River — Spring 2026",
      damId: willow.id,
      sireId: river.id,
      expectedDate: new Date("2026-05-15"),
      status: "EXPECTING",
      notes: "River is Willow's son with Oak — high relatedness; use Mating COI tool",
    },
  });

  // Planned litter with puppies available
  const litter3 = await prisma.litter.create({
    data: {
      name: "Honey x Cedar — Planned",
      damId: honey.id,
      sireId: cedar.id,
      expectedDate: new Date("2026-08-01"),
      status: "PLANNED",
      notes: "Check COI — Cedar and Honey share Maple/Prestige ancestry",
    },
  });

  const pups = await Promise.all([
    prisma.puppy.create({
      data: {
        litterId: litter3.id,
        tempName: "Pup A",
        sex: "FEMALE",
        color: "Cream",
        status: "AVAILABLE",
        pickPosition: 1,
      },
    }),
    prisma.puppy.create({
      data: {
        litterId: litter3.id,
        tempName: "Pup B",
        sex: "MALE",
        color: "Apricot",
        status: "RESERVED",
        pickPosition: 2,
      },
    }),
    prisma.puppy.create({
      data: {
        litterId: litter3.id,
        tempName: "Pup C",
        sex: "FEMALE",
        color: "Red",
        status: "AVAILABLE",
        pickPosition: 3,
      },
    }),
  ]);

  await prisma.reservation.create({
    data: {
      litterId: litter3.id,
      puppyId: pups[1].id,
      buyerName: "Jordan Lee",
      buyerEmail: "jordan.lee@example.com",
      buyerPhone: "404-555-0142",
      depositAmount: 500,
      paymentMethod: "VENMO",
      paidWhere: "Kennel Venmo @MGGA",
      pickPosition: 2,
      status: "OPEN",
      notes: "Wants apricot male",
    },
  });

  await prisma.reservation.create({
    data: {
      litterId: litter2.id,
      buyerName: "Sam Rivera",
      buyerEmail: "sam.r@example.com",
      buyerPhone: "770-555-0199",
      depositAmount: 400,
      paymentMethod: "ZELLE",
      paidWhere: "Business checking",
      pickPosition: 1,
      status: "OPEN",
      notes: "First pick on Willow litter",
    },
  });

  await prisma.healthRecord.createMany({
    data: [
      {
        dogId: maple.id,
        title: "Annual wellness + heartworm",
        notes: "Clear. Next vaccines due spring.",
        recordDate: new Date("2025-04-10"),
        followUpAt: new Date("2026-04-10"),
      },
      {
        dogId: maple.id,
        title: "OFA hips / elbows",
        notes: "Good / Normal",
        recordDate: new Date("2021-06-01"),
      },
      {
        dogId: oak.id,
        title: "Genetic panel (Embark)",
        notes: "Clear for PRA, DM, ICH. Carrier: none of concern.",
        recordDate: new Date("2022-01-15"),
      },
      {
        dogId: honey.id,
        title: "Spay consult follow-up",
        notes: "Deferred — breeding candidate. Recheck before next cycle.",
        recordDate: new Date("2025-11-01"),
        followUpAt: new Date("2026-10-01"),
      },
      {
        dogId: willow.id,
        title: "Prenatal checkup",
        notes: "Ultrasound scheduled; monitor weight.",
        recordDate: new Date("2026-03-01"),
        followUpAt: new Date("2026-04-15"),
      },
    ],
  });


  await prisma.inquiry.createMany({
    data: [
      {
        name: "Jordan Blake",
        email: "jordan.blake@example.com",
        phone: "404-555-0142",
        message: "Hi! Looking for a mini golden doodle puppy for our family this fall. Do you have a waitlist?",
        source: "godaddy_form",
        status: "NEW",
        externalId: "seed-godaddy-001",
        rawPayload: JSON.stringify({
          name: "Jordan Blake",
          email: "jordan.blake@example.com",
          phone: "404-555-0142",
          message: "Hi! Looking for a mini golden doodle puppy for our family this fall. Do you have a waitlist?",
          formId: "contact-us",
          submittedAt: "2026-09-10T15:22:00Z",
        }),
      },
      {
        name: "Alex Chen",
        email: "alex.chen@example.com",
        phone: null,
        message: "Subject: Puppy inquiry\n\nSaw your site — interested in a female with a lighter coat. Can you share upcoming litter dates?",
        source: "email",
        status: "CONTACTED",
        externalId: "seed-email-msg-002",
        rawPayload: JSON.stringify({
          from: "Alex Chen <alex.chen@example.com>",
          subject: "Puppy inquiry",
          text: "Saw your site — interested in a female with a lighter coat. Can you share upcoming litter dates?",
          date: "2026-09-08T09:10:00Z",
        }),
      },
      {
        name: "Taylor Morgan",
        email: "taylor.m@example.com",
        phone: "678-555-0177",
        message: "Called about deposits and pick order. Prefers male, hypoallergenic coat.",
        source: "manual",
        status: "NEW",
        externalId: null,
        rawPayload: null,
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Users: michael@doodledoggy.local / partner@doodledoggy.local");
  console.log("Password: doodle2024!");
  console.log(`Dogs: ${await prisma.dog.count()}, Litters: ${await prisma.litter.count()}, Inquiries: ${await prisma.inquiry.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
