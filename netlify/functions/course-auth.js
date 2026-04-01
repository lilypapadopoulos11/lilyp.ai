// course-auth.js — Student email verification for Claude... Actually
//
// HOW TO ADD NEW STUDENTS:
// After a Gumroad purchase, add the student's email to the approvedEmails
// array below. Emails are case-insensitive (automatically normalized).
//
// Example:
//   const approvedEmails = [
//     'student@example.com',
//     'another@university.edu',
//   ]
//
// TODO: Connect to Gumroad webhook to auto-approve on purchase.
// Gumroad sends a POST to a webhook URL after each sale with the
// buyer's email. A future version of this function could listen
// for that webhook and maintain a persistent list (e.g. in Airtable).

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let email
  try {
    const parsed = JSON.parse(event.body)
    email = parsed.email
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!email || typeof email !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) }
  }

  // Approved student emails — add manually after each Gumroad purchase
  const approvedEmails = [
    // Add student emails here after purchase, e.g.:
    // 'student@example.com',
  ]

  const normalizedEmail = email.toLowerCase().trim()

  if (approvedEmails.map(e => e.toLowerCase().trim()).includes(normalizedEmail)) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access: true })
    }
  }

  return {
    statusCode: 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access: false })
  }
}
