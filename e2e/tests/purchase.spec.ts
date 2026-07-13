import { test, expect } from '@playwright/test';

const SLUG = 'e2e-forum';

test.describe("Tunnel d'achat public", () => {
  test('la landing affiche l’événement et la formule réelle', async ({ page }) => {
    await page.goto(`/fr/e/${SLUG}`);
    await expect(page.getByRole('heading', { name: 'Forum E2E 2026' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Standard' })).toBeVisible();
    await expect(page.getByText(/25\s*000/).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Choisir cette formule/i }).first(),
    ).toBeVisible();
  });

  test('cliquer sur la formule mène à la page d’achat présentiel', async ({ page }) => {
    await page.goto(`/fr/e/${SLUG}`);
    await page.getByRole('link', { name: /Choisir cette formule/i }).first().click();
    await expect(page).toHaveURL(/\/e\/e2e-forum\/acheter\/presentiel/);
    await expect(page.getByRole('textbox', { name: /Prénom/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Email/i })).toBeVisible();
  });

  test('achat manuel complet → commande créée + redirection paiement manuel', async ({ page }) => {
    await page.goto(`/fr/e/${SLUG}/acheter/presentiel`);

    // Formule, pays (Côte d'Ivoire) et indicatif (+225) sont pré-remplis par défaut.
    await page.getByLabel('Prénom', { exact: true }).fill('Awa');
    await page.getByLabel('Nom', { exact: true }).fill('Koné'); // 'Nom' est sous-chaîne de 'Prénom'
    await page.getByLabel('Email', { exact: true }).fill('awa.kone@example.ci');
    await page.getByLabel('WhatsApp', { exact: true }).fill('0700000000');

    // Bascule sur le paiement manuel (Western Union).
    await page.getByRole('button', { name: 'Western Union' }).click();

    const submit = page.getByRole('button', { name: /Confirmer et payer/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Le backend a créé la commande → redirection vers l'écran de preuve manuelle.
    await page.waitForURL(/\/paiement\/manuel\?.*order_id=/);
    expect(page.url()).toMatch(/order_id=[0-9a-f-]{36}/);
  });
});
