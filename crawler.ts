import puppeteer from 'puppeteer';

interface Highlight {
  title: string;
  highlights: string[];
  token: string;
  fullName?: string;
  email?: string;
  password?: string;
  databaseId?: string;
}

async function launchCrawler(email: string, password: string, token: string, ): Promise<Highlight[]> {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  await page.goto('https://read.amazon.com/notebook');

  // type into email field
  await page.type('#ap_email', email);
  // type into password field
  await page.type('#ap_password', password);
  // click on login button
  await page.click('#signInSubmit');
  // wait for navigation to home page
  await page.waitForNavigation();

  // wait for books to load
  await page.waitForSelector('#kp-notebook-library');

  const books = await page.evaluate(() => {
    const library = document.querySelector('#kp-notebook-library');
    const books = Array.from(library!.children).filter(child => child.tagName === 'DIV');
    return books;
  });

  console.log("Number of books: " + books.length);
  const numBooks: number = books.length;

  let bookHighlights: Highlight[] = [];

  // iterate through books and click on each one
  for (let i = 0; i < numBooks; i++) {

    // get book title
    const bookTitle: string = await page.evaluate((i) => {
      const library = document.querySelector('#kp-notebook-library');
      const books = Array.from(library!.children).filter(child => child.tagName === 'DIV');
      const book = books[i];
      const title = book.getElementsByTagName('h2')[0].textContent;

      if (title) {  
        return title;
      } else {
        throw new Error('No title found');
      }
    }, i);

    // open book highlights
    await page.click(`#kp-notebook-library > div:nth-child(${i + 1})`);

    // wait for highlight selector to load and get highlights
    await page.waitForSelector('#highlight');
    const highlights: string[] = await page.evaluate(() => {
      const highlight = document.querySelectorAll('#highlight');

      let highlights: string[] = [];

      highlight.forEach(highlight => {
        if (typeof highlight.textContent === 'string') {
          highlights.push(highlight.textContent);
        } else {
          throw new Error('Highlight is not a string');
        }
      });

      return highlights;
    });

    let bookHighlight: Highlight= {
      title: bookTitle,
      highlights: highlights,
      token: token,
    }

    bookHighlights.push(bookHighlight);
  }

  await browser.close();

  return bookHighlights;
};

export default async function crawler(users: any) {
  let responses = [];
  for (const user of users) {
    const response = await launchCrawler(user.email, user.password, user.token);
    responses.push(response);
  }
  return responses[0];
}