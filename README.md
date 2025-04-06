# 🚨 SafeRoute – Community-Sourced Safety Map

  Theme:   Civic Tech / Urban Safety  
  Tagline:    Built by the community, for the community. 

SafeRoute is a civic-tech web application that allows users to report unsafe areas in their city—such as poor lighting, harassment zones, or road hazards—and view them on a heatmap. It also helps users plan safer routes using community-sourced data.

---

## 🌍 Features

- 🗺️   Interactive Map   using Leaflet.js
- 🧑‍🤝‍🧑   Anonymous Community Reporting   (e.g., potholes, unsafe zones, etc.)
- 👍   Upvote System   to highlight important reports
- 🧭   Safer Route Suggestions  
- 💬   Feedback System   (optional)
- 🐘   PostgreSQL   as the primary database
- 🚀   Deployed on Vercel  

---

## 🛠️ Tech Stack

| Layer        | Tools/Frameworks             |
|--------------|------------------------------|
| Frontend     | React.js, Tailwind CSS       |
| Map          | Leaflet.js                   |
| Backend      | Node.js, Express             |
| Database     | PostgreSQL                   |
| Deployment   | Vercel                       |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/samarth-chawla/SafeRoute
```

```

Make sure PostgreSQL is running and the database exists.

```
### 2. Install Dependencies

#### Frontend

```bash
cd client
npm install
npm run dev
```

#### Backend

```bash
cd server
npm install
npm run dev
```

---

## 🗃️ Project Structure

```
saferoute/
├── client/         # React frontend
├── server/         # Node.js backend
├── api/            # Vercel functions (if applicable)
├── prisma/         # DB schema (optional if using Prisma ORM)
├── public/         # Static assets
└── README.md
```

---

## 💡 How It Works

1. Users visit the interactive map.
2. They report issues or upvote existing ones.
3. The map updates with real-time heatmaps.
4. The app suggests safer alternate travel routes based on user data.

---

## 🌐 Live Demo

🔗 https://safe-route-eight.vercel.app/

---

## 🤝 Contributing

We welcome community contributions!

```bash
git checkout -b feature/yourFeature
git commit -m "Add new feature"
git push origin feature/yourFeature
```

Then open a Pull Request on GitHub.

---

## ✨ Team

Developed with ❤️ by BEETLES


