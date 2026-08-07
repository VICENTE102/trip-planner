import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { SearchParams, TripProposal } from "../../types";
import { formatDate } from "../../utils/dates";
import { TIER_THEME } from "../../constants/tierTheme";

interface TripPdfDocumentProps {
  proposal: TripProposal;
  searchParams: SearchParams;
  heroImageUrl: string | null;
}

// @react-pdf/renderer usa su propio motor de layout (Flexbox, no CSS/Tailwind
// del resto de la app), por eso el PDF tiene su propia hoja de estilos y sus
// propios colores en hexadecimal en vez de reutilizar TIER_THEME/index.css.
const TIER_HEX: Record<TripProposal["tier"], string> = {
  barato: "#10b981",
  medio: "#6366f1",
  caro: "#f59e0b",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 11,
    color: "#1f2430",
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 260,
    objectFit: "cover",
  },
  coverContent: {
    marginTop: 220,
  },
  tierBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  destinationTitle: {
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 6,
  },
  coverMeta: {
    fontSize: 12,
    color: "#4b5160",
    marginBottom: 3,
  },
  priceTotal: {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 18,
  },
  budgetNote: {
    fontSize: 11,
    marginTop: 2,
  },
  overBudget: { color: "#b45309" },
  underBudget: { color: "#0f766e" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 14,
  },
  dayBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e4ea",
  },
  dayHeading: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  },
  block: {
    marginBottom: 6,
  },
  blockLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#6b7280",
    marginBottom: 1,
  },
  blockText: {
    fontSize: 11,
    color: "#1f2430",
  },
  nightBlock: {
    backgroundColor: "#1f2430",
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  nightText: {
    fontSize: 11,
    color: "#ffffff",
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryHeading: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
  },
  summaryLine: {
    fontSize: 11,
    marginBottom: 2,
  },
  summarySubline: {
    fontSize: 10,
    color: "#4b5160",
    marginBottom: 2,
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  expenseTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e2e4ea",
    fontWeight: 700,
  },
  disclaimer: {
    fontSize: 8,
    color: "#8b90a0",
    marginTop: 6,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#8b90a0",
    textAlign: "center",
  },
});

export function TripPdfDocument({ proposal, searchParams, heroImageUrl }: TripPdfDocumentProps) {
  const { tier, hotel, itinerary, economicSummary } = proposal;
  const { outboundFlight, returnFlight } = itinerary;
  const isOverBudget = economicSummary.remaining < 0;
  const travelers = searchParams.travelers + searchParams.children;

  return (
    <Document title={`Viaje a ${searchParams.destination} — TripPlanner`}>
      <Page size="A4" style={styles.page}>
        {heroImageUrl && <Image src={heroImageUrl} style={styles.heroImage} />}
        <View style={styles.coverContent}>
          <Text style={[styles.tierBadge, { backgroundColor: TIER_HEX[tier] }]}>{TIER_THEME[tier].label}</Text>
          <Text style={styles.destinationTitle}>{searchParams.destination}</Text>
          <Text style={styles.coverMeta}>
            {searchParams.origin} → {searchParams.destination}
          </Text>
          <Text style={styles.coverMeta}>
            {formatDate(searchParams.departureDate)} – {formatDate(searchParams.returnDate)} · {itinerary.totalDays}{" "}
            días · {itinerary.totalNights} noches
          </Text>
          <Text style={styles.coverMeta}>
            {travelers} viajero{travelers > 1 ? "s" : ""}
          </Text>
          <Text style={styles.priceTotal}>{economicSummary.total}€</Text>
          <Text style={[styles.budgetNote, isOverBudget ? styles.overBudget : styles.underBudget]}>
            {isOverBudget
              ? `Excede el presupuesto en ${Math.abs(economicSummary.remaining)}€`
              : `Sobran ${economicSummary.remaining}€ de presupuesto`}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Itinerario completo</Text>
        {itinerary.days.map((day) => (
          <View key={day.dayNumber} style={styles.dayBlock} wrap={false}>
            <Text style={styles.dayHeading}>
              Día {day.dayNumber} · {formatDate(day.date)}
            </Text>

            <View style={styles.block}>
              <Text style={styles.blockLabel}>MAÑANA</Text>
              <Text style={styles.blockText}>{day.morning}</Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockLabel}>RESTAURANTE RECOMENDADO</Text>
              <Text style={styles.blockText}>
                {day.restaurant.name} — {day.restaurant.description} ({day.restaurant.area})
              </Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockLabel}>TARDE</Text>
              <Text style={styles.blockText}>{day.afternoon}</Text>
            </View>

            <View style={styles.nightBlock}>
              <Text style={styles.blockLabel}>NOCHE</Text>
              <Text style={styles.nightText}>{day.night}</Text>
            </View>
          </View>
        ))}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Resumen</Text>

        <View style={styles.summarySection}>
          <Text style={styles.summaryHeading}>Alojamiento</Text>
          <Text style={styles.summaryLine}>
            {hotel.name} {"★".repeat(hotel.stars)}
          </Text>
          <Text style={styles.summarySubline}>
            Valoración {hotel.rating.toFixed(1)} / 5 · {hotel.amenities.join(" · ")}
          </Text>
          <Text style={styles.summarySubline}>
            {hotel.pricePerNight}€ / noche · Total: {hotel.totalPrice}€
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryHeading}>Vuelos</Text>
          {outboundFlight && returnFlight ? (
            <>
              <Text style={styles.summaryLine}>
                Ida · {outboundFlight.airline} · {outboundFlight.departureTime}–{outboundFlight.arrivalTime} ·{" "}
                {outboundFlight.stops === 0 ? "directo" : `${outboundFlight.stops} escala(s)`} ·{" "}
                {outboundFlight.price}€
              </Text>
              <Text style={styles.summaryLine}>
                Vuelta · {returnFlight.airline} · {returnFlight.departureTime}–{returnFlight.arrivalTime} ·{" "}
                {returnFlight.stops === 0 ? "directo" : `${returnFlight.stops} escala(s)`} · {returnFlight.price}€
              </Text>
            </>
          ) : (
            <Text style={styles.summarySubline}>No hay datos de vuelo simulados para este viaje.</Text>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryHeading}>Gastos</Text>
          <View style={styles.expenseRow}>
            <Text>Alojamiento</Text>
            <Text>{economicSummary.accommodation}€</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text>Comidas (estimado)</Text>
            <Text>{economicSummary.meals}€</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text>Transporte (estimado)</Text>
            <Text>{economicSummary.transport}€</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text>Entradas y actividades (estimado)</Text>
            <Text>{economicSummary.activities}€</Text>
          </View>
          <View style={styles.expenseTotalRow}>
            <Text>TOTAL</Text>
            <Text>{economicSummary.total}€</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text style={isOverBudget ? styles.overBudget : styles.underBudget}>
              {isOverBudget ? "Excedido respecto al presupuesto" : "Restante del presupuesto"}
            </Text>
            <Text style={isOverBudget ? styles.overBudget : styles.underBudget}>
              {Math.abs(economicSummary.remaining)}€
            </Text>
          </View>
          <Text style={styles.disclaimer}>
            Estimación orientativa. No incluye seguro de viaje, propinas u otros extras.
          </Text>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
