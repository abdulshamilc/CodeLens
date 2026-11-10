// src/tools/whiteboard/utils/templates.js
// Pre-built developer architecture & diagram templates for one-click insertion

export const DIAGRAM_TEMPLATES = [
  {
    id: "web-app-architecture",
    title: "Client-Server & API Architecture",
    description: "Web client connecting to an API Gateway, Auth service, and Database.",
    icon: "🌐",
    generate: (originX = 100, originY = 150) => {
      const client = {
        id: `tpl-client-${Date.now()}`,
        type: "client",
        x: originX,
        y: originY,
        width: 130,
        height: 100,
        strokeColor: "#38bdf8",
        fillColor: "rgba(56, 189, 248, 0.12)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Client / SPA",
      };

      const server = {
        id: `tpl-server-${Date.now()}`,
        type: "server",
        x: originX + 260,
        y: originY,
        width: 150,
        height: 100,
        strokeColor: "#6366f1",
        fillColor: "rgba(99, 102, 241, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "API Gateway",
      };

      const auth = {
        id: `tpl-auth-${Date.now()}`,
        type: "auth",
        x: originX + 285,
        y: originY - 160,
        width: 100,
        height: 110,
        strokeColor: "#f59e0b",
        fillColor: "rgba(245, 158, 11, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "OAuth / JWT",
      };

      const db = {
        id: `tpl-db-${Date.now()}`,
        type: "database",
        x: originX + 530,
        y: originY,
        width: 120,
        height: 130,
        strokeColor: "#10b981",
        fillColor: "rgba(16, 185, 129, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "PostgreSQL",
      };

      const connClientServer = {
        id: `tpl-conn1-${Date.now()}`,
        type: "connector-straight",
        x: client.x + client.width,
        y: client.y + client.height / 2,
        width: server.x - (client.x + client.width),
        height: 0,
        strokeColor: "#38bdf8",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        fromId: client.id,
        fromAnchor: "right",
        toId: server.id,
        toAnchor: "left",
        label: "HTTPS REST",
      };

      const connServerAuth = {
        id: `tpl-conn2-${Date.now()}`,
        type: "connector-straight",
        x: server.x + server.width / 2,
        y: server.y,
        width: 0,
        height: auth.y + auth.height - server.y,
        strokeColor: "#f59e0b",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "dashed",
        fromId: server.id,
        fromAnchor: "top",
        toId: auth.id,
        toAnchor: "bottom",
        label: "Verify Token",
      };

      const connServerDb = {
        id: `tpl-conn3-${Date.now()}`,
        type: "connector-straight",
        x: server.x + server.width,
        y: server.y + server.height / 2,
        width: db.x - (server.x + server.width),
        height: 0,
        strokeColor: "#10b981",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        fromId: server.id,
        fromAnchor: "right",
        toId: db.id,
        toAnchor: "left",
        label: "SQL Query",
      };

      return [client, server, auth, db, connClientServer, connServerAuth, connServerDb];
    },
  },
  {
    id: "microservices-cloud",
    title: "Cloud & Microservices Cluster",
    description: "Cloud entry point routing to backend services and cluster storage.",
    icon: "☁️",
    generate: (originX = 100, originY = 150) => {
      const cloud = {
        id: `tpl-cloud-${Date.now()}`,
        type: "cloud",
        x: originX,
        y: originY + 50,
        width: 150,
        height: 100,
        strokeColor: "#06b6d4",
        fillColor: "rgba(6, 182, 212, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Cloud Edge CDN",
      };

      const svc1 = {
        id: `tpl-svc1-${Date.now()}`,
        type: "backend-service",
        x: originX + 270,
        y: originY - 30,
        width: 140,
        height: 80,
        strokeColor: "#6366f1",
        fillColor: "rgba(99, 102, 241, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Users Service",
      };

      const svc2 = {
        id: `tpl-svc2-${Date.now()}`,
        type: "backend-service",
        x: originX + 270,
        y: originY + 130,
        width: 140,
        height: 80,
        strokeColor: "#a855f7",
        fillColor: "rgba(168, 85, 247, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Orders Service",
      };

      const db = {
        id: `tpl-cluster-db-${Date.now()}`,
        type: "database",
        x: originX + 530,
        y: originY + 50,
        width: 120,
        height: 130,
        strokeColor: "#10b981",
        fillColor: "rgba(16, 185, 129, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Distributed DB",
      };

      const conn1 = {
        id: `tpl-c1-${Date.now()}`,
        type: "connector-elbow",
        x: cloud.x + cloud.width,
        y: cloud.y + cloud.height / 2,
        width: svc1.x - (cloud.x + cloud.width),
        height: svc1.y + svc1.height / 2 - (cloud.y + cloud.height / 2),
        strokeColor: "#6366f1",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        routing: "elbow",
        fromId: cloud.id,
        fromAnchor: "right",
        toId: svc1.id,
        toAnchor: "left",
      };

      const conn2 = {
        id: `tpl-c2-${Date.now()}`,
        type: "connector-elbow",
        x: cloud.x + cloud.width,
        y: cloud.y + cloud.height / 2,
        width: svc2.x - (cloud.x + cloud.width),
        height: svc2.y + svc2.height / 2 - (cloud.y + cloud.height / 2),
        strokeColor: "#a855f7",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        routing: "elbow",
        fromId: cloud.id,
        fromAnchor: "right",
        toId: svc2.id,
        toAnchor: "left",
      };

      const conn3 = {
        id: `tpl-c3-${Date.now()}`,
        type: "connector-elbow",
        x: svc1.x + svc1.width,
        y: svc1.y + svc1.height / 2,
        width: db.x - (svc1.x + svc1.width),
        height: db.y + db.height / 2 - (svc1.y + svc1.height / 2),
        strokeColor: "#10b981",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        routing: "elbow",
        fromId: svc1.id,
        fromAnchor: "right",
        toId: db.id,
        toAnchor: "left",
      };

      return [cloud, svc1, svc2, db, conn1, conn2, conn3];
    },
  },
  {
    id: "algorithm-flowchart",
    title: "Algorithm & Logic Flowchart",
    description: "Start node, process step, decision branch, and output.",
    icon: "🔀",
    generate: (originX = 150, originY = 100) => {
      const start = {
        id: `tpl-start-${Date.now()}`,
        type: "flowchart-start",
        x: originX,
        y: originY,
        width: 140,
        height: 50,
        strokeColor: "#22c55e",
        fillColor: "rgba(34, 197, 94, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Start Program",
      };

      const step1 = {
        id: `tpl-proc-${Date.now()}`,
        type: "process",
        x: originX,
        y: originY + 110,
        width: 140,
        height: 60,
        strokeColor: "#6366f1",
        fillColor: "rgba(99, 102, 241, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Load Input Data",
      };

      const decision = {
        id: `tpl-dec-${Date.now()}`,
        type: "decision",
        x: originX + 5,
        y: originY + 230,
        width: 130,
        height: 80,
        strokeColor: "#f59e0b",
        fillColor: "rgba(245, 158, 11, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Data Valid?",
      };

      const end = {
        id: `tpl-end-${Date.now()}`,
        type: "flowchart-start",
        x: originX,
        y: originY + 370,
        width: 140,
        height: 50,
        strokeColor: "#ef4444",
        fillColor: "rgba(239, 68, 68, 0.15)",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "End Program",
      };

      const c1 = {
        id: `tpl-fc1-${Date.now()}`,
        type: "connector-straight",
        x: start.x + start.width / 2,
        y: start.y + start.height,
        width: 0,
        height: step1.y - (start.y + start.height),
        strokeColor: "#6366f1",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        fromId: start.id,
        fromAnchor: "bottom",
        toId: step1.id,
        toAnchor: "top",
      };

      const c2 = {
        id: `tpl-fc2-${Date.now()}`,
        type: "connector-straight",
        x: step1.x + step1.width / 2,
        y: step1.y + step1.height,
        width: 0,
        height: decision.y - (step1.y + step1.height),
        strokeColor: "#f59e0b",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        fromId: step1.id,
        fromAnchor: "bottom",
        toId: decision.id,
        toAnchor: "top",
      };

      const c3 = {
        id: `tpl-fc3-${Date.now()}`,
        type: "connector-straight",
        x: decision.x + decision.width / 2,
        y: decision.y + decision.height,
        width: 0,
        height: end.y - (decision.y + decision.height),
        strokeColor: "#22c55e",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        fromId: decision.id,
        fromAnchor: "bottom",
        toId: end.id,
        toAnchor: "top",
        label: "Yes",
      };

      return [start, step1, decision, end, c1, c2, c3];
    },
  },
  {
    id: "code-explanation-layout",
    title: "Code Snippet & Output Explainer",
    description: "Code Block side-by-side with execution terminal and annotation notes.",
    icon: "📝",
    generate: (originX = 100, originY = 120) => {
      const codeBlock = {
        id: `tpl-code-${Date.now()}`,
        type: "code-block",
        x: originX,
        y: originY,
        width: 320,
        height: 200,
        strokeColor: "#6366f1",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        code: `async function fetchUserData(userId) {\n  const res = await api.get(\`/users/\${userId}\`);\n  console.log("User Loaded:", res.data);\n  return res.data;\n}`,
        language: "javascript",
        lineNumbers: true,
      };

      const terminal = {
        id: `tpl-term-${Date.now()}`,
        type: "terminal",
        x: originX + 400,
        y: originY + 20,
        width: 260,
        height: 160,
        strokeColor: "#38bdf8",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        text: "Console Output",
      };

      const conn = {
        id: `tpl-c-code-${Date.now()}`,
        type: "connector-straight",
        x: codeBlock.x + codeBlock.width,
        y: codeBlock.y + codeBlock.height / 2,
        width: terminal.x - (codeBlock.x + codeBlock.width),
        height: 0,
        strokeColor: "#38bdf8",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "dashed",
        fromId: codeBlock.id,
        fromAnchor: "right",
        toId: terminal.id,
        toAnchor: "left",
        label: "stdout",
      };

      return [codeBlock, terminal, conn];
    },
  },
];

