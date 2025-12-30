# 🔗 URL Shortener – Serverless Assignment

A simple **URL Shortener application** built using **AWS Serverless architecture**.  
This project allows users to generate a short URL for a long URL and redirect back to the original URL when accessed.

---

## 🚀 Features

- Create a short URL for any valid long URL
- Redirect short URL → original URL
- Input validation and error handling
- Uses DynamoDB for fast and scalable storage
- Fully serverless no servers to manage
- Written in **TypeScript**
- Unit tested using **Jest**

---

## 🛠️ Tech Stack

- **AWS Lambda** – Backend compute
- **Amazon API Gateway** – REST API
- **Amazon DynamoDB** – NoSQL database
- **AWS SAM** – Infrastructure as Code
- **Node.js (v20)**  
- **TypeScript**
- **Jest** – Unit testing

---
##  Request Body Structure

### Create Short URL

**Endpoint**
```
POST /get-url-shortner
```

**Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "url": "https://example.com"
}
```

**Field Description**

| Field | Type | Required | Description |
|------|------|----------|-------------|
| url  | string | Yes | Original long URL |

**Notes**
- Body must be valid JSON
- URL must include protocol (`http` or `https`)
- Invalid or missing URL will return `400 Bad Request`


