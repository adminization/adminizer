import { faker } from '@faker-js/faker';
import { generate } from 'password-hash';
import { DataSource } from 'typeorm';
import { UserAP } from '../../src';
import { Example } from '../models/sequelize/Example';
export async function seedDatabase(
  collections: Record<string, any>,
  count: number = 3
) {
  const getRandomTime = () => {
    const hours = faker.number.int({ min: 0, max: 23 }).toString().padStart(2, '0');
    const minutes = faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const exampleModel = collections.example ?? collections.Example;
  const testModel = collections.test ?? collections.Test;
  const userModel = collections.userap ?? collections.UserAP;
  const groupModel = collections.groupap ?? collections.GroupAP;


  const isSequelize = typeof exampleModel?.bulkCreate === 'function';

  if (!exampleModel || !userModel || !groupModel || !isSequelize) {
    throw new Error('Models should support the Sequelize interface');
  }

  // ------------------ Groups ------------------ //
  const groupNames = [
    { name: 'Admins', description: 'System administrators', tokens: [
      'ai-assistant-dummy',
      'ai-assistant-openai',
    ] },
    { name: 'Users', description: 'Registered users', tokens:
      [
        "create-test-model",
        "read-test-model",
        "update-test-model",
        "delete-test-model",

        "create-example-model",
        "read-example-model",
        "update-example-model",

        "read-jsonschema-model",
        "ai-assistant-dummy",
        "ai-assistant-openai",
      ]
    },
    { name: 'Guests', description: 'Guest access' },
  ];

  for (const group of groupNames) {
    const exists = await groupModel.findOne({ where: { name: group.name } });

    if (!exists) {
      await groupModel.create(group);
    }
  }

  // ------------------ Users ------------------ //
  const users = [
    { login: 'pass', password: 'pass', fullName: 'User Pass' },
    { login: 'demo', password: 'demo', fullName: 'Administrator', isAdministrator: true },
    { login: 'user1', password: 'user1', fullName: 'User One' },
    { login: 'admin', password: 'admin', fullName: 'Admin User', isAdministrator: true },
    { login: 'user2', password: 'user2', fullName: 'User Two' },
    { login: 'user3', password: 'user3', fullName: 'User Three', isConfirmed: true },
    { login: 'openai', password: 'openai', fullName: 'OpenAI Agent', isAdministrator: true, isConfirmed: true },
  ];

  for (const u of users) {
    const exists = await userModel.findOne({ where: { login: u.login } });

    if (!exists) {
      const userData = {
        login: u.login,
        password: u.password,
        passwordHashed: generate(u.login+u.password+process.env.AP_PASSWORD_SALT),
        fullName: u.fullName,
        isActive: true,
        isAdministrator: u.isAdministrator || false,
        isConfirmed: u.isConfirmed
      };

      const userInstance = await userModel.create(userData);


      // Linking to groups (simplified logic)
      const groupName = u.isAdministrator ? 'Admins' : 'Users';

      const group = await groupModel.findOne({ where: { name: groupName } });

      if (group && group.addUser) {
        await group.addUser(userInstance);
      }
    }
  }


  // ------------------ Example Records ------------------ //
  const exampleCount = await exampleModel.count();

  const allUsers: UserAP[] = await userModel.findAll();

    if (exampleCount === 0) {
      // Helper function to get ISO week number (YYYY-Www format)
      const getWeekNumber = (date: Date): string => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      };

      const fakeExamples = Array.from({ length: count }, () => {
        const randomUser = faker.helpers.arrayElement(allUsers);
        return {
          title:         faker.lorem.word(),
          description:   faker.lorem.paragraph(),
          disabled_text: faker.lorem.sentence(),
          sort:          faker.datatype.boolean(),
          time:          getRandomTime(),
          number:        faker.number.int(300),
          color:         faker.color.rgb(),
          range:         faker.number.int({ min: 10, max: 80 }),
          date:          faker.date.past(),
          month:         faker.date.past().toISOString().slice(0, 7),
          week:          getWeekNumber(faker.date.past()),
          datetime:      faker.date.recent().toISOString().slice(0, 16),
          code:          faker.lorem.paragraphs(2),
          editor:        faker.lorem.paragraphs(3),
          selectMany:    faker.helpers.arrayElements(['Sone', 'Stwo', 'Sthree', 'Sfour', 'Sfive'], 2),
          select:        faker.helpers.arrayElement(['decrease', 'increase', 'none']),
          tui:           faker.lorem.paragraphs(2),
          datatable:     [
            { name: faker.commerce.product(), footage: faker.number.int(100), price: faker.number.int(1000) },
            { name: faker.commerce.product(), footage: faker.number.int(100), price: faker.number.int(1000) }
          ],
          json:          { key: faker.lorem.word(), value: faker.lorem.word(), count: faker.number.int(100) },
          ownerId:       randomUser.id,
        }
      }
  );

    await exampleModel.bulkCreate(fakeExamples);
  }

    // ------------------ Tests ------------------ //
    const testCount = await testModel.count();

  if (testCount === 0) {
    const allUsers: UserAP[] = await userModel.findAll();

    const allExamples: Example[] = await exampleModel.findAll();

    const fakeTests = Array.from({ length: count }, () => {
      const randomUser = faker.helpers.arrayElement(allUsers);
      const randomExample = faker.helpers.arrayElement(allExamples);

      return {
        title: faker.lorem.words(3),
        ownerId: randomUser.id,
        exampleId: randomExample?.id ?? null,
      };
    });

    await testModel.bulkCreate(fakeTests);
  }


    // ------------------ JsonSchemas ------------------ //
  const jsonSchemaModel = collections.jsonschema ?? collections.JsonSchema;

  const schemaCount = await jsonSchemaModel.count();

  if (schemaCount === 0) {
    const fakeSchemas = Array.from({ length: 3 }, () => {
      const schemaData = {
        data: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" }
          },
          required: ["name"]
        },
        name: faker.internet.username()
      };
      return schemaData;
    });

    await jsonSchemaModel.bulkCreate(fakeSchemas);
  }
}

export async function seedTypeOrmDatabase(
  dataSource: DataSource,
  count: number = 3
) {
  const getRandomTime = () => {
    const hours = faker.number.int({ min: 0, max: 23 }).toString().padStart(2, '0');
    const minutes = faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const groupRepository = dataSource.getRepository('GroupAP');
  const userRepository = dataSource.getRepository('UserAP');
  const exampleRepository = dataSource.getRepository('Example');
  const testRepository = dataSource.getRepository('Test');
  const jsonSchemaRepository = dataSource.getRepository('JsonSchema');

  const groupNames = [
    { name: 'Admins', description: 'System administrators', tokens: [
      'ai-assistant-dummy',
      'ai-assistant-openai',
    ] },
    { name: 'Users', description: 'Registered users', tokens:
      [
        "create-test-model",
        "read-test-model",
        "update-test-model",
        "delete-test-model",

        "create-example-model",
        "read-example-model",
        "update-example-model",

        "read-jsonschema-model",
        "ai-assistant-dummy",
        "ai-assistant-openai",
      ]
    },
    { name: 'Guests', description: 'Guest access' },
  ];

  for (const group of groupNames) {
    const exists = await groupRepository.findOne({ where: { name: group.name } });
    if (!exists) {
      await groupRepository.save(group);
    }
  }

  const users = [
    { login: 'pass', password: 'pass', fullName: 'User Pass' },
    { login: 'demo', password: 'demo', fullName: 'Administrator', isAdministrator: true },
    { login: 'user1', password: 'user1', fullName: 'User One' },
    { login: 'admin', password: 'admin', fullName: 'Admin User', isAdministrator: true },
    { login: 'user2', password: 'user2', fullName: 'User Two' },
    { login: 'user3', password: 'user3', fullName: 'User Three', isConfirmed: true },
    { login: 'openai', password: 'openai', fullName: 'OpenAI Agent', isAdministrator: true, isConfirmed: true },
  ];

  for (const u of users) {
    const exists = await userRepository.findOne({ where: { login: u.login } });
    if (exists) {
      continue;
    }

    const groupName = u.isAdministrator ? 'Admins' : 'Users';
    const group = await groupRepository.findOne({ where: { name: groupName } });
    await userRepository.save({
      login: u.login,
      passwordHashed: generate(u.login + u.password + process.env.AP_PASSWORD_SALT),
      fullName: u.fullName,
      isActive: true,
      isAdministrator: u.isAdministrator || false,
      isConfirmed: u.isConfirmed,
      groups: group ? [group] : [],
    });
  }

  const exampleCount = await exampleRepository.count();
  const allUsers = await userRepository.find();

  if (exampleCount === 0) {
    const getWeekNumber = (date: Date): string => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const fakeExamples = Array.from({ length: count }, () => {
      const randomUser = faker.helpers.arrayElement(allUsers);
      return {
        title: faker.lorem.word(),
        description: faker.lorem.paragraph(),
        disabled_text: faker.lorem.sentence(),
        sort: faker.datatype.boolean(),
        time: getRandomTime(),
        number: faker.number.int(300),
        color: faker.color.rgb(),
        range: faker.number.int({ min: 10, max: 80 }),
        date: faker.date.past(),
        month: faker.date.past().toISOString().slice(0, 7),
        week: getWeekNumber(faker.date.past()),
        datetime: faker.date.recent(),
        code: faker.lorem.paragraphs(2),
        editor: faker.lorem.paragraphs(3),
        selectMany: faker.helpers.arrayElements(['Sone', 'Stwo', 'Sthree', 'Sfour', 'Sfive'], 2),
        select: faker.helpers.arrayElement(['decrease', 'increase', 'none']),
        tui: faker.lorem.paragraphs(2),
        datatable: [
          { name: faker.commerce.product(), footage: faker.number.int(100), price: faker.number.int(1000) },
          { name: faker.commerce.product(), footage: faker.number.int(100), price: faker.number.int(1000) }
        ],
        json: { key: faker.lorem.word(), value: faker.lorem.word(), count: faker.number.int(100) },
        owner: randomUser,
      };
    });

    await exampleRepository.save(fakeExamples);
  }

  const testCount = await testRepository.count();

  if (testCount === 0) {
    const freshUsers = await userRepository.find();
    const allExamples = await exampleRepository.find();

    const fakeTests = Array.from({ length: count }, () => {
      const randomUser = faker.helpers.arrayElement(freshUsers);
      const randomExample = faker.helpers.arrayElement(allExamples);

      return {
        title: faker.lorem.words(3),
        owner: randomUser,
        example: randomExample ?? null,
      };
    });

    await testRepository.save(fakeTests);
  }

  const schemaCount = await jsonSchemaRepository.count();

  if (schemaCount === 0) {
    const fakeSchemas = Array.from({ length: 3 }, () => ({
      data: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name"]
      },
      name: faker.internet.username()
    }));

    await jsonSchemaRepository.save(fakeSchemas);
  }
}
