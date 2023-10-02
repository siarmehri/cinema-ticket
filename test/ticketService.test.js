import TicketService from "../src/pairtest/TicketService.js";
import InvalidPurchaseException from "../src/pairtest/lib/InvalidPurchaseException.js";
import TicketTypeRequest from "../src/pairtest/lib/TicketTypeRequest.js";

const ticketPaymentService = {
  makePayment: jest.fn(),
};

const seatReservationService = {
  reserveSeat: jest.fn(),
};

const ticketService = new TicketService(ticketPaymentService, seatReservationService);

describe("TicketService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("purchaseTickets", () => {
    it("should throw an error: invalid account", () => {
      expect(() => ticketService.purchaseTickets("", [])).toThrow(InvalidPurchaseException);
      expect(() => ticketService.purchaseTickets(0, [])).toThrow(InvalidPurchaseException);
      expect(() => ticketService.purchaseTickets(-1, [])).toThrow(InvalidPurchaseException);
    });

    it("should throw an error: wrong ticket type request", () => {
      expect(() => ticketService.purchaseTickets(1, {})).toThrow(InvalidPurchaseException);
    });

    it("should throw an error: the ticket type provided is not supported", () => {
      expect(() => ticketService.purchaseTickets(ticketService.purchaseTickets(1, new TicketTypeRequest('WHATEVER', 10)))).toThrow(TypeError);
    });

    it("should throw an error: noOfTickets must be an integer", () => {
      expect(() => ticketService.purchaseTickets(ticketService.purchaseTickets(1, new TicketTypeRequest('ADULT', 'XYZ')))).toThrow(TypeError);
    });

    it("should throw an error: only maximum of 20 tickets can be purchased at a time", () => {
      expect(() =>
        ticketService.purchaseTickets(
          1,
          new TicketTypeRequest('ADULT', 10),
          new TicketTypeRequest('CHILD', 10),
          new TicketTypeRequest('INFANT', 10)
        )
      ).toThrow(InvalidPurchaseException);
    });

    it("should throw an error: the children and infants should be accompanied by an adult", () => {
      expect(() => ticketService.purchaseTickets(
        1,
        new TicketTypeRequest('CHILD', 10),
        new TicketService('INFANT', 10)
      )).toThrow(InvalidPurchaseException);
    });

    it("should successfully purchase ticket and reserve seats", () => {
      ticketService.purchaseTickets(1,
        new TicketTypeRequest('ADULT', 10),
        new TicketTypeRequest('CHILD', 5),
        new TicketTypeRequest('INFANT', 5)
      );
      expect(ticketPaymentService.makePayment).toHaveBeenCalledWith(1, 250);
      expect(seatReservationService.reserveSeat).toHaveBeenCalledWith(1, 15);
    });
  });
});
