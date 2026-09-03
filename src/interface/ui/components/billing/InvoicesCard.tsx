import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, FileText } from "lucide-react";
import type { InvoiceSummary } from "@/application/ports/PaymentGateway";
import { createPortalAction } from "@/app/(app)/app/billing-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBillingAmount, formatBillingDate } from "@/lib/billing-format";
import { BillingSubmitButton } from "./BillingSubmitButton";

const STATUS_VARIANT: Record<
  InvoiceSummary["status"],
  "success" | "warning" | "danger" | "default"
> = {
  paid: "success",
  open: "warning",
  uncollectible: "danger",
  void: "default",
};

/**
 * Historique des factures (lecture Stripe, sans cache) : date, numéro, montant, statut, liens
 * vers la facture hébergée et son PDF. Le pied de carte ouvre l'accueil du portail Stripe pour
 * les coordonnées de facturation (nom/adresse/e-mail sur facture) — hors périmètre Cartora.
 */
export function InvoicesCard({ invoices }: { invoices: InvoiceSummary[] }) {
  const t = useTranslations("Billing");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invoices.title")}</CardTitle>
        <CardDescription>{t("invoices.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("invoices.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoices.date")}</TableHead>
                  <TableHead>{t("invoices.number")}</TableHead>
                  <TableHead className="text-right">{t("invoices.amount")}</TableHead>
                  <TableHead>{t("invoices.status")}</TableHead>
                  <TableHead className="sr-only">{t("invoices.view")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatBillingDate(invoice.createdAtISO, locale)}
                    </TableCell>
                    <TableCell className="font-mono text-caption text-muted-foreground">
                      {invoice.number ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatBillingAmount(invoice.totalCents, invoice.currency, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[invoice.status]}>
                        {t(`invoices.statusLabel.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        {invoice.hostedInvoiceUrl && (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            {t("invoices.view")}
                          </a>
                        )}
                        {invoice.pdfUrl && (
                          <a
                            href={invoice.pdfUrl}
                            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                          >
                            <FileText className="size-3.5" aria-hidden="true" />
                            {t("invoices.pdf")}
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 border-t sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-foreground">{t("actions.billingDetailsHint")}</p>
        <form action={createPortalAction} className="shrink-0">
          <BillingSubmitButton
            label={t("actions.billingDetails")}
            icon={<ExternalLink />}
            variant="ghost"
            size="sm"
          />
        </form>
      </CardFooter>
    </Card>
  );
}
