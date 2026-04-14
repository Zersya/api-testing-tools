/**
 * Postman-style dynamic (magic) variables for mocking data.
 * Values are generated at substitution time. Variable names are case-sensitive.
 * @see https://learning.postman.com/docs/tests-and-scripts/write-scripts/variables-list
 */

import { faker } from '@faker-js/faker';

export interface MagicVariableDescriptor {
  name: string;
  description: string;
}

/**
 * Get the application base URL from runtime config
 * This is used for the $appUrl magic variable
 */
function getAppUrl(): string {
  try {
    // In server context, useRuntimeConfig is available
    const { useRuntimeConfig } = require('#imports');
    const config = useRuntimeConfig();
    return config.public?.appUrl || process.env.APP_URL || 'http://localhost:3000';
  } catch {
    // Fallback for non-Nuxt contexts
    return process.env.APP_URL || 'http://localhost:3000';
  }
}

const MAGIC_GENERATORS: Record<string, () => string> = {
  // System
  $appUrl: getAppUrl,

  // Common
  $guid: () => crypto.randomUUID(),
  $timestamp: () => String(Math.floor(Date.now() / 1000)),
  $isoTimestamp: () => new Date().toISOString(),
  $randomUUID: () => crypto.randomUUID(),

  // Text, numbers, and colors
  $randomAlphaNumeric: () =>
    faker.helpers.arrayElement(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
    ),
  $randomBoolean: () => String(faker.helpers.arrayElement([true, false])),
  $randomInt: () => String(faker.number.int({ min: 0, max: 1000 })),
  $randomColor: () => faker.color.human(),
  $randomHexColor: () => faker.color.rgb({ format: 'hex' }),
  $randomAbbreviation: () =>
    faker.helpers.arrayElement(['SQL', 'PCI', 'JSON', 'API', 'HTTP', 'XML', 'UTF', 'CSS']),

  // Internet and IP addresses
  $randomIP: () => faker.internet.ip(),
  $randomIPV6: () => faker.internet.ipv6(),
  $randomMACAddress: () =>
    Array.from({ length: 6 }, () =>
      faker.string.hex({ length: 2, casing: 'lower' })
    ).join(':'),
  $randomPassword: () =>
    faker.string.alphanumeric(15),
  $randomLocale: () => faker.helpers.arrayElement(['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'zh', 'ny', 'sr', 'si']),
  $randomUserAgent: () => faker.internet.userAgent(),
  $randomProtocol: () => faker.helpers.arrayElement(['http', 'https']),
  $randomSemver: () => faker.system.semver(),

  // Names
  $randomFirstName: () => faker.person.firstName(),
  $randomLastName: () => faker.person.lastName(),
  $randomFullName: () => faker.person.fullName(),
  $randomNamePrefix: () => faker.person.prefix(),
  $randomNameSuffix: () => faker.person.suffix(),

  // Profession
  $randomJobArea: () => faker.person.jobArea(),
  $randomJobDescriptor: () =>
    faker.helpers.arrayElement(['Forward', 'Corporate', 'Senior', 'Lead', 'Global']),
  $randomJobTitle: () => faker.person.jobTitle(),
  $randomJobType: () =>
    faker.helpers.arrayElement(['Supervisor', 'Manager', 'Coordinator', 'Director', 'Analyst']),

  // Phone, address, and location
  $randomPhoneNumber: () => faker.phone.number('###-###-####'),
  $randomPhoneNumberExt: () => faker.phone.number('##-###-###-####'),
  $randomCity: () => faker.location.city(),
  $randomStreetName: () => faker.location.street(),
  $randomStreetAddress: () => faker.location.streetAddress(),
  $randomCountry: () => faker.location.country(),
  $randomCountryCode: () => faker.location.countryCode('alpha-2'),
  $randomLatitude: () => String(faker.location.latitude()),
  $randomLongitude: () => String(faker.location.longitude()),

  // Images
  $randomAvatarImage: () => faker.image.avatar(),
  $randomImageUrl: () => faker.image.url(),
  $randomAbstractImage: () => faker.image.urlLoremFlickr({ category: 'abstract' }),
  $randomAnimalsImage: () => faker.image.urlLoremFlickr({ category: 'animals' }),
  $randomBusinessImage: () => faker.image.urlLoremFlickr({ category: 'business' }),
  $randomCatsImage: () => faker.image.urlLoremFlickr({ category: 'cats' }),
  $randomCityImage: () => faker.image.urlLoremFlickr({ category: 'city' }),
  $randomFoodImage: () => faker.image.urlLoremFlickr({ category: 'food' }),
  $randomNightlifeImage: () => faker.image.urlLoremFlickr({ category: 'nightlife' }),
  $randomFashionImage: () => faker.image.urlLoremFlickr({ category: 'fashion' }),
  $randomPeopleImage: () => faker.image.urlLoremFlickr({ category: 'people' }),
  $randomNatureImage: () => faker.image.urlLoremFlickr({ category: 'nature' }),
  $randomSportsImage: () => faker.image.urlLoremFlickr({ category: 'sports' }),
  $randomTransportImage: () => faker.image.urlLoremFlickr({ category: 'transport' }),
  $randomImageDataUri: () =>
    `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20fill%3D%22%23${faker.string.hex({ length: 6, casing: 'lower' })}%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3C%2Fsvg%3E`,

  // Finance
  $randomBankAccount: () => faker.finance.accountNumber(8),
  $randomBankAccountName: () =>
    faker.helpers.arrayElement([
      'Home Loan Account',
      'Checking Account',
      'Savings Account',
      'Auto Loan Account',
    ]),
  $randomCreditCardMask: () =>
    faker.finance.maskedNumber({ length: 4, parens: false, ellipsis: false }),
  $randomBankAccountBic: () => faker.finance.bic(),
  $randomBankAccountIban: () => faker.finance.iban(),
  $randomTransactionType: () => faker.finance.transactionType(),
  $randomCurrencyCode: () => faker.finance.currencyCode(),
  $randomCurrencyName: () => faker.finance.currencyName(),
  $randomCurrencySymbol: () => faker.finance.currencySymbol(),
  $randomBitcoin: () => faker.finance.bitcoinAddress(),

  // Business
  $randomCompanyName: () => faker.company.name(),
  $randomCompanySuffix: () =>
    faker.helpers.arrayElement(['Inc', 'LLC', 'Group', 'Corp', 'Ltd']),
  $randomBs: () => faker.company.buzzPhrase(),
  $randomBsAdjective: () => faker.helpers.arrayElement(['viral', '24/7', '24/365', 'dynamic']),
  $randomBsBuzz: () =>
    faker.helpers.arrayElement(['repurpose', 'harness', 'transition', 'synergize']),
  $randomBsNoun: () =>
    faker.helpers.arrayElement(['e-services', 'markets', 'interfaces', 'solutions']),

  // Catchphrases
  $randomCatchPhrase: () => faker.company.catchPhrase(),
  $randomCatchPhraseAdjective: () => faker.company.catchPhraseAdjective(),
  $randomCatchPhraseDescriptor: () => faker.company.catchPhraseDescriptor(),
  $randomCatchPhraseNoun: () => faker.company.catchPhraseNoun(),

  // Databases
  $randomDatabaseColumn: () =>
    faker.helpers.arrayElement(['updatedAt', 'token', 'group', 'userId', 'email']),
  $randomDatabaseType: () =>
    faker.helpers.arrayElement(['tinyint', 'text', 'varchar', 'int', 'bigint']),
  $randomDatabaseCollation: () =>
    faker.helpers.arrayElement(['cp1250_bin', 'utf8_general_ci', 'cp1250_general_ci']),
  $randomDatabaseEngine: () =>
    faker.helpers.arrayElement(['MyISAM', 'InnoDB', 'Memory']),

  // Dates
  $randomDateFuture: () => faker.date.future().toString(),
  $randomDatePast: () => faker.date.past().toString(),
  $randomDateRecent: () => faker.date.recent().toString(),
  $randomWeekday: () => faker.date.weekday(),
  $randomMonth: () => faker.date.month(),

  // Domains, emails, and usernames
  $randomDomainName: () => faker.internet.domainName(),
  $randomDomainSuffix: () =>
    faker.helpers.arrayElement(['com', 'org', 'net', 'io', 'co']),
  $randomDomainWord: () => faker.internet.domainWord(),
  $randomEmail: () => faker.internet.email(),
  $randomExampleEmail: () => faker.internet.exampleEmail(),
  $randomUserName: () => faker.internet.userName(),
  $randomUrl: () => faker.internet.url(),

  // Files and directories
  $randomFileName: () => faker.system.fileName(),
  $randomFileType: () => faker.system.fileType(),
  $randomFileExt: () => faker.system.fileExt(),
  $randomCommonFileName: () => faker.system.commonFileName(),
  $randomCommonFileType: () => faker.system.commonFileType(),
  $randomCommonFileExt: () => faker.system.commonFileExt(),
  $randomFilePath: () => faker.system.filePath(),
  $randomDirectoryPath: () => faker.system.directoryPath(),
  $randomMimeType: () => faker.system.mimeType(),

  // Stores
  $randomPrice: () => String(faker.commerce.price({ min: 0, max: 1000 })),
  $randomProduct: () => faker.commerce.product(),
  $randomProductAdjective: () => faker.commerce.productAdjective(),
  $randomProductMaterial: () => faker.commerce.productMaterial(),
  $randomProductName: () => faker.commerce.productName(),
  $randomDepartment: () => faker.commerce.department(),

  // Grammar
  $randomNoun: () => faker.word.noun(),
  $randomVerb: () => faker.word.verb(),
  $randomIngverb: () =>
    faker.helpers.arrayElement([
      'synthesizing',
      'navigating',
      'backing up',
      'processing',
      'loading',
      'generating',
      'calculating',
      'updating',
    ]),
  $randomAdjective: () => faker.word.adjective(),
  $randomWord: () => faker.word.sample(),
  $randomWords: () => faker.word.words(5),
  $randomPhrase: () => faker.lorem.sentence(),

  // Lorem ipsum
  $randomLoremWord: () => faker.lorem.word(),
  $randomLoremWords: () => faker.lorem.words(3),
  $randomLoremSentence: () => faker.lorem.sentence(),
  $randomLoremSentences: () => faker.lorem.sentences(3),
  $randomLoremParagraph: () => faker.lorem.paragraph(),
  $randomLoremParagraphs: () => faker.lorem.paragraphs(3, '\n\n'),
  $randomLoremText: () => faker.lorem.paragraphs(2),
  $randomLoremSlug: () => faker.lorem.slug(3),
  $randomLoremLines: () => faker.lorem.lines(3),
};

const MAGIC_DESCRIPTIONS: Record<string, string> = {
  // System
  $appUrl: 'The base URL of the application (from APP_URL env var)',

  // Common
  $guid: 'A uuid-v4 style guid',
  $timestamp: 'Current UNIX timestamp in seconds',
  $isoTimestamp: 'Current ISO timestamp at zero UTC',
  $randomUUID: 'A random 36-character UUID',
  $randomAlphaNumeric: 'A random alpha-numeric character',
  $randomBoolean: 'A random boolean value',
  $randomInt: 'A random integer between 0 and 1000',
  $randomColor: 'A random color name',
  $randomHexColor: 'A random hex color value',
  $randomAbbreviation: 'A random abbreviation',
  $randomIP: 'A random IPv4 address',
  $randomIPV6: 'A random IPv6 address',
  $randomMACAddress: 'A random MAC address',
  $randomPassword: 'A random 15-character alpha-numeric password',
  $randomLocale: 'A random two-letter language code (ISO 639-1)',
  $randomUserAgent: 'A random user agent string',
  $randomProtocol: 'A random internet protocol (http/https)',
  $randomSemver: 'A random semantic version number',
  $randomFirstName: 'A random first name',
  $randomLastName: 'A random last name',
  $randomFullName: 'A random first and last name',
  $randomNamePrefix: 'A random name prefix (Dr., Ms., Mr.)',
  $randomNameSuffix: 'A random name suffix (I, MD, DDS)',
  $randomJobArea: 'A random job area',
  $randomJobDescriptor: 'A random job descriptor',
  $randomJobTitle: 'A random job title',
  $randomJobType: 'A random job type',
  $randomPhoneNumber: 'A random ten-digit phone number',
  $randomPhoneNumberExt: 'A random phone number with extension',
  $randomCity: 'A random city name',
  $randomStreetName: 'A random street name',
  $randomStreetAddress: 'A random street address',
  $randomCountry: 'A random country',
  $randomCountryCode: 'A random two-letter country code',
  $randomLatitude: 'A random latitude coordinate',
  $randomLongitude: 'A random longitude coordinate',
  $randomAvatarImage: 'A random avatar image URL',
  $randomImageUrl: 'A URL of a random image',
  $randomAbstractImage: 'A URL of a random abstract image',
  $randomAnimalsImage: 'A URL of a random animal image',
  $randomBusinessImage: 'A URL of a random business image',
  $randomCatsImage: 'A URL of a random cat image',
  $randomCityImage: 'A URL of a random city image',
  $randomFoodImage: 'A URL of a random food image',
  $randomNightlifeImage: 'A URL of a random nightlife image',
  $randomFashionImage: 'A URL of a random fashion image',
  $randomPeopleImage: 'A URL of a random person image',
  $randomNatureImage: 'A URL of a random nature image',
  $randomSportsImage: 'A URL of a random sports image',
  $randomTransportImage: 'A URL of a random transport image',
  $randomImageDataUri: 'A random image data URI',
  $randomBankAccount: 'A random 8-digit bank account number',
  $randomBankAccountName: 'A random bank account name',
  $randomCreditCardMask: 'A random masked credit card number',
  $randomBankAccountBic: 'A random BIC',
  $randomBankAccountIban: 'A random IBAN',
  $randomTransactionType: 'A random transaction type',
  $randomCurrencyCode: 'A random 3-letter currency code',
  $randomCurrencyName: 'A random currency name',
  $randomCurrencySymbol: 'A random currency symbol',
  $randomBitcoin: 'A random bitcoin address',
  $randomCompanyName: 'A random company name',
  $randomCompanySuffix: 'A random company suffix',
  $randomBs: 'A random business-speak phrase',
  $randomBsAdjective: 'A random business-speak adjective',
  $randomBsBuzz: 'A random business-speak buzzword',
  $randomBsNoun: 'A random business-speak noun',
  $randomCatchPhrase: 'A random catchphrase',
  $randomCatchPhraseAdjective: 'A random catchphrase adjective',
  $randomCatchPhraseDescriptor: 'A random catchphrase descriptor',
  $randomCatchPhraseNoun: 'A random catchphrase noun',
  $randomDatabaseColumn: 'A random database column name',
  $randomDatabaseType: 'A random database type',
  $randomDatabaseCollation: 'A random database collation',
  $randomDatabaseEngine: 'A random database engine',
  $randomDateFuture: 'A random future datetime',
  $randomDatePast: 'A random past datetime',
  $randomDateRecent: 'A random recent datetime',
  $randomWeekday: 'A random weekday',
  $randomMonth: 'A random month',
  $randomDomainName: 'A random domain name',
  $randomDomainSuffix: 'A random domain suffix',
  $randomDomainWord: 'A random domain word',
  $randomEmail: 'A random email address',
  $randomExampleEmail: 'A random example-domain email',
  $randomUserName: 'A random username',
  $randomUrl: 'A random URL',
  $randomFileName: 'A random file name',
  $randomFileType: 'A random file type',
  $randomFileExt: 'A random file extension',
  $randomCommonFileName: 'A random common file name',
  $randomCommonFileType: 'A random common file type',
  $randomCommonFileExt: 'A random common file extension',
  $randomFilePath: 'A random file path',
  $randomDirectoryPath: 'A random directory path',
  $randomMimeType: 'A random MIME type',
  $randomPrice: 'A random price between 0 and 1000',
  $randomProduct: 'A random product',
  $randomProductAdjective: 'A random product adjective',
  $randomProductMaterial: 'A random product material',
  $randomProductName: 'A random product name',
  $randomDepartment: 'A random commerce department',
  $randomNoun: 'A random noun',
  $randomVerb: 'A random verb',
  $randomIngverb: 'A random verb ending in -ing',
  $randomAdjective: 'A random adjective',
  $randomWord: 'A random word',
  $randomWords: 'Random words',
  $randomPhrase: 'A random phrase',
  $randomLoremWord: 'A random lorem ipsum word',
  $randomLoremWords: 'Random lorem ipsum words',
  $randomLoremSentence: 'A random lorem ipsum sentence',
  $randomLoremSentences: 'Random lorem ipsum sentences',
  $randomLoremParagraph: 'A random lorem ipsum paragraph',
  $randomLoremParagraphs: 'Three random lorem ipsum paragraphs',
  $randomLoremText: 'Random lorem ipsum text',
  $randomLoremSlug: 'A random lorem ipsum URL slug',
  $randomLoremLines: 'Random lines of lorem ipsum',
};

/**
 * Returns the generated value for a known magic variable, or null if not a magic variable.
 * Each call generates a fresh value (no caching).
 */
export function getMagicVariableValue(name: string): string | null {
  const trimmed = name.trim();
  const generator = MAGIC_GENERATORS[trimmed];
  if (!generator) return null;
  try {
    return generator();
  } catch {
    return null;
  }
}

/**
 * Returns the list of all supported magic variable names.
 */
export function getMagicVariableNames(): string[] {
  return Object.keys(MAGIC_GENERATORS);
}

/**
 * Returns names and descriptions for all magic variables (for API/docs).
 */
export function getMagicVariableDescriptors(): MagicVariableDescriptor[] {
  return getMagicVariableNames().map((name) => ({
    name,
    description: MAGIC_DESCRIPTIONS[name] ?? 'Dynamic value',
  }));
}
