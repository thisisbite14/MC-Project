// tests/auth.spec.js
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173"; // หรือ URL ของ Frontend คุณ

// ---------- LOGIN TESTS ----------
test.describe("Login Page", () => {

  test("ควรแสดงฟอร์มล็อกอินครบถ้วน", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // ตรวจว่ามี input/email, password, ปุ่ม login
    await expect(page.getByPlaceholder("อีเมล")).toBeVisible();
    await expect(page.getByPlaceholder("รหัสผ่าน")).toBeVisible();
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("เข้าสู่ระบบสำเร็จเมื่อกรอกข้อมูลถูกต้อง", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.getByPlaceholder("อีเมล").fill("admin@gmail.com");
    await page.getByPlaceholder("รหัสผ่าน").fill("!Thisisbite14");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    // รอ redirect ไปหน้าแรก หรือมีข้อความต้อนรับ
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("text=ยินดีต้อนรับ")).toBeVisible();
  });

  test("เข้าสู่ระบบไม่สำเร็จเมื่อกรอกข้อมูลผิด", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder("อีเมล").fill("wrong@gmail.com");
    await page.getByPlaceholder("รหัสผ่าน").fill("wrongpass");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    // ตรวจข้อความ error
    await expect(page.locator("text=อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
  });

  test("ป้องกันฟอร์มว่าง (validation)", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page.locator("text=กรุณากรอกอีเมล")).toBeVisible();
    await expect(page.locator("text=กรุณากรอกรหัสผ่าน")).toBeVisible();
  });
});

