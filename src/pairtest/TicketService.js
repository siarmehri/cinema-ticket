import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js'
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js'

export default class TicketService {
  // [Business Rule# 2] The ticket prices are based on the type of ticket
  TICKET_PRICES = {
    INFANT: 0,
    CHILD: 10,
    ADULT: 20,
  };

  // [Business Rule# 5] Only a maximum of 20 tickets that can be purchased at a time.
  MAX_TICKETS_PURCHASE_ALLOWED = 20;

  ticketPaymentService;
  seatReservationService;

  constructor(ticketPaymentService, seatReservationService) {
    if (!ticketPaymentService instanceof TicketPaymentService) {
      throw new Error(
        'ticketPaymentService is not instance of TicketPaymentService'
      );
    }

    if (!seatReservationService instanceof SeatReservationService) {
      throw new Error(
        'seatReservationService is not instance of SeatReservationService'
      );
    }

    this.ticketPaymentService = ticketPaymentService;
    this.seatReservationService = seatReservationService;
  }


  /**
   * Should only have private methods other than the one below.
   */
  purchaseTickets = (accountId, ...ticketTypeRequests) => {
    // throws InvalidPurchaseException
    try {
      this.#isValidAccountId(accountId);
      const purchaseSummary = this.#getPurchaseSummary(ticketTypeRequests);
      this.#validatePurchaseSummary(purchaseSummary);
      this.ticketPaymentService.makePayment(accountId, purchaseSummary.total_amount);
      this.seatReservationService.reserveSeat(accountId, purchaseSummary.total_seats);
      return { purchase_summary: purchaseSummary };
    } catch (error) {
      throw error;
    }
  }

  #getInitializedPurchaseSummary = () => {
    return {
      total_tickets: 0,
      total_amount: 0,
      total_seats: 0,
      total_adult_tickets: 0,
      total_child_tickets: 0,
      total_infant_tickets: 0
    };
  }

  #getPurchaseSummary = (ticketTypeRequests) => {
    const purchaseSummary = this.#getInitializedPurchaseSummary();
    for (const ticketTypeRequest of ticketTypeRequests) {
      if (!(ticketTypeRequest instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException(
          'Sorry, wrong ticket type request'
        );
      }

      let ticketType = ticketTypeRequest.getTicketType();
      let noOfTickets = ticketTypeRequest.getNoOfTickets();

      // [Business Rule# 1] There are 3 types of tickets i.e. Infant, Child, and Adult.
      switch (ticketType) {
        case 'ADULT':
          purchaseSummary.total_adult_tickets += noOfTickets;
          // Adding to noOfTickets to total_seats as the ticket type is 'ADULT'
          purchaseSummary.total_seats += noOfTickets;
          break;
        case 'CHILD':
          purchaseSummary.total_child_tickets += noOfTickets;
          // Adding to noOfTickets to total_seats as the ticket type is 'CHILD'
          purchaseSummary.total_seats += noOfTickets;
          break;
        case 'INFANT':
          purchaseSummary.total_infant_tickets += noOfTickets;
          // [Business Rule# 6] Infants do not pay for a ticket and are not allocated a seat
          // They will be sitting on an Adult's lap.
          // Therefore, no seat reservation.
          break;
        default:
          // [Business Rule# 1] There are 3 types of tickets
          // i.e. Infant, Child, and Adult.
          // Even though this rule is implemented in TicketTypeRequest constructor.
          // Just in case :-)
          throw new InvalidPurchaseException('Sorry, the ticket type provided is not supported');
      }

      // total tickets equals to number of tickets in ticket type request
      purchaseSummary.total_tickets += noOfTickets;
      // total price equals to noOfTickets * ticket price for the specified ticket type request
      purchaseSummary.total_amount += noOfTickets * this.TICKET_PRICES[ticketType];
    }
    return purchaseSummary;
  }

  #validatePurchaseSummary = (purchaseSummary) => {
    // [Business Rule# 5] Only a maximum of 20 tickets that can be purchased at a time.
    if (purchaseSummary.total_tickets > this.MAX_TICKETS_PURCHASE_ALLOWED) {
      throw new InvalidPurchaseException(
        `Sorry, only maximum of ${this.MAX_TICKETS_PURCHASE_ALLOWED} tickets can be purchased at a time`
      );
    }
    // [Business Rule# 7] Child and Infant tickets cannot be purchased without purchasing an Adult ticket.
    const noAdultTicketCheck = (
      purchaseSummary.total_infant_tickets > 0
      || purchaseSummary.total_child_tickets > 0
    ) && purchaseSummary.total_adult_tickets === 0;

    if (noAdultTicketCheck) {
      throw new InvalidPurchaseException(
        'Sorry, the children and infants should be accompanied by an adult'
      );
    }
  }

  #isValidAccountId = (accountId) => {
    if (!Number.isInteger(accountId) || accountId <= 0) {
      // [Assumption] All accounts with an id greater than zero are valid.
      throw new InvalidPurchaseException('Sorry, invalid account');
    }
  }
}
