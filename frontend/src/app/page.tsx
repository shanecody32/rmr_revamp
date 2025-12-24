"use client";

import { Card, Typography, Button, Space, Divider, Tag } from "antd";
import { CheckCircleOutlined, ApiOutlined, DatabaseOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>("Checking...");
  const [backendMessage, setBackendMessage] = useState<string>("");

  useEffect(() => {
    // Check backend health
    fetch("http://localhost:3000/health")
      .then((res) => res.text())
      .then((data) => {
        setBackendStatus("Connected");
        setBackendMessage("Backend is running");
      })
      .catch(() => {
        setBackendStatus("Disconnected");
        setBackendMessage("Backend is not running. Start it with: cd backend/server && cargo run");
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: "50px", background: "#f0f2f5" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card>
            <Title level={1}>🎉 RMR Revamp</Title>
            <Paragraph>
              Welcome to the RMR Revamp project! This application is built with:
            </Paragraph>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Tag color="orange" icon={<ApiOutlined />}>
                  Backend: Rust + Axum + SeaORM + Seography
                </Tag>
                <Tag color="blue" icon={<CheckCircleOutlined />}>
                  Frontend: Next.js + Ant Design
                </Tag>
                <Tag color="green" icon={<DatabaseOutlined />}>
                  Database: PostgreSQL
                </Tag>
              </div>
            </Space>
          </Card>

          <Card title="Backend Status">
            <Space direction="vertical">
              <div>
                <Text strong>Status: </Text>
                <Tag color={backendStatus === "Connected" ? "success" : "error"}>
                  {backendStatus}
                </Tag>
              </div>
              <Paragraph>{backendMessage}</Paragraph>
            </Space>
          </Card>

          <Card title="Tech Stack">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={4}>Backend</Title>
                <ul>
                  <li><Text strong>Rust:</Text> Systems programming language</li>
                  <li><Text strong>Axum:</Text> Web framework (v0.7)</li>
                  <li><Text strong>SeaORM:</Text> Async ORM for Rust (v1.x)</li>
                  <li><Text strong>Seography:</Text> GraphQL framework for SeaORM (v1.x)</li>
                  <li><Text strong>Tokio:</Text> Async runtime</li>
                </ul>
              </div>
              <Divider />
              <div>
                <Title level={4}>Frontend</Title>
                <ul>
                  <li><Text strong>Next.js:</Text> React framework (v16)</li>
                  <li><Text strong>Ant Design:</Text> UI component library</li>
                  <li><Text strong>TypeScript:</Text> Type-safe JavaScript</li>
                </ul>
              </div>
            </Space>
          </Card>

          <Card title="Getting Started">
            <Space direction="vertical" size="middle">
              <div>
                <Title level={5}>1. Set up the database</Title>
                <Paragraph>
                  Create a PostgreSQL database and update the <Text code>.env</Text> file with your connection string.
                </Paragraph>
              </div>
              <div>
                <Title level={5}>2. Generate entities</Title>
                <Paragraph>
                  Run: <Text code>sea-orm-cli generate entity -o backend/src/entities --with-serde both</Text>
                </Paragraph>
              </div>
              <div>
                <Title level={5}>3. Start the backend</Title>
                <Paragraph>
                  Run: <Text code>cd backend/server && cargo run</Text>
                </Paragraph>
              </div>
              <div>
                <Title level={5}>4. Start the frontend</Title>
                <Paragraph>
                  Run: <Text code>cd frontend && npm run dev</Text>
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
}
