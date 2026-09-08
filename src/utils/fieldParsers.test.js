import {
  extractMarksheetData,
  extractCommunityCertificateData,
  extractIncomeCertificateData,
} from "./fieldParsers";

describe("fieldParsers", () => {
  describe("Marksheet Field Extraction", () => {
    test("extracts 10th marksheet data for Nithishkumar M", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        DEPARTMENT OF GOVERNMENT EXAMINATIONS
        SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)
        NAME OF THE CANDIDATE: NITHISHKUMAR M
        SESSION: MARCH 2022
        DATE OF BIRTH: 15/08/2004
        PERMANENT REGISTER NUMBER: 1234567
        TOTAL MARKS : 349 THREE FOUR NINE (PASS)
        NAME OF THE SCHOOL: GOVT HIGHER SECONDARY SCHOOL SALEM
      `;

      const res = extractMarksheetData(text, "ms10");
      expect(res.name).toBe("Nithishkumar M");
      expect(res.dob).toBe("15-08-2004");
      expect(res.registerNumber).toBe("1234567");
      expect(res.marksScored).toBe("349");
      expect(res.maxMarks).toBe("500");
      expect(res.percentage).toBe("69.80%");
      expect(res.grade).toBe("Pass");
      expect(res.year).toBe("2022");
      expect(res.school).toContain("GOVT HIGHER SECONDARY SCHOOL SALEM");
    });

    test("extracts Ragul C 10th marksheet with OCR noise prefix and Tamil text", () => {
      const text = `
        தமிழ்நாடு மாநிலப் பள்ளித் தேர்வுகள் குழுமம்
        STATE BOARD OF SCHOOL EXAMINATIONS, TAMILNADU
        SECONDARY SCHOOL LEAVING CERTIFICATE
        பத்தாம் வகுப்பு / X STANDARD
        தேர்வரின் பெயர் / NAME OF THE CANDIDATE
        ராகுல் சி
        Pe Ragul C
        பருவம் / SESSION: மே 2022 / MAY 2022
        பிறந்த தேதி / DATE OF BIRTH: 24/06/2007 ROLL NO. 1349459
        நிரந்தரப் பதிவெண் / PERMANENT REGISTER NO. XM22R0491349459
        மொத்த மதிப்பெண்கள் / TOTAL MARKS : 358 THREE FIVE EIGHT (PASS)
        பள்ளியின் பெயர் / NAME OF THE SCHOOL
        eGausrmpgn uf CuwDmau und sgewmogyt Com X SWAMY VIVEKANANDAR MATRIC HR SEC SCHOOL KANCHAMALAYUR SALEM
      `;

      const res = extractMarksheetData(text, "ms10");
      expect(res.name).toBe("Ragul C");
      expect(res.dob).toBe("24-06-2007");
      expect(res.registerNumber).toBe("XM22R0491349459");
      expect(res.marksScored).toBe("358");
      expect(res.maxMarks).toBe("500");
      expect(res.percentage).toBe("71.60%");
      expect(res.grade).toBe("Pass");
      expect(res.year).toBe("2022");
      expect(res.school).toBe("SWAMY VIVEKANANDAR MATRIC HR SEC SCHOOL KANCHAMALAYUR SALEM");
    });

    test("extracts 12th marksheet data for Nithishkumar M", () => {
      const text = `
        STATE BOARD OF SCHOOL EXAMINATIONS, TAMILNADU
        HIGHER SECONDARY COURSE - SECOND YEAR MARK CERTIFICATE
        தேர்வரின் பெயர் / NAME OF THE CANDIDATE
        NITHISHKUMAR M
        MAR 2024
        DATE OF BIRTH: 15/08/2004
        PERMANENT REGISTER NUMBER: 2313288953
        TOTAL MARKS : 0465 ZERO FOUR SIX FIVE
        NAME OF THE SCHOOL: SWAMY VIVEKANANDAR MATRIC HR SEC SCHOOL KANCHAMALAYUR SALEM
      `;

      const res = extractMarksheetData(text, "ms12");
      expect(res.name).toBe("Nithishkumar M");
      expect(res.dob).toBe("15-08-2004");
      expect(res.registerNumber).toBe("2313288953");
      expect(res.marksScored).toBe("465");
      expect(res.maxMarks).toBe("600");
      expect(res.percentage).toBe("77.50%");
      expect(res.year).toBe("2024");
      expect(res.school).toBe("SWAMY VIVEKANANDAR MATRIC HR SEC SCHOOL KANCHAMALAYUR SALEM");
    });

    test("extracts Ragul C 12th marksheet correctly scoring RAGUL C over Tamil OCR noise", () => {
      const text = `
        STATE BOARD OF SCHOOL EXAMINATIONS, TAMILNADU
        HIGHER SECONDARY COURSE - SECOND YEAR MARK CERTIFICATE
        CERTIFICATE SL. NO : HSS 35272015
        தேர்வரின் பெயர் / NAME OF THE CANDIDATE
        Nm - Quipiiaei Il Caen
        RAGUL C MAR 2024
        பிறந்த தேதி / DATE OF BIRTH: 24/06/2007 PERMANENT REGISTER NUMBER: 2313289153
        மொத்த மதிப்பெண்கள் / TOTAL MARKS : 0412 ZERO FOUR ONE TWO
        NAME OF THE SCHOOL
        SWAMY VIVEKANANDAR MATRIC HR SEC SCHOOL KANCHAMALAYUR SALEM
      `;

      const res = extractMarksheetData(text, "ms12");
      expect(res.name).toBe("Ragul C");
      expect(res.dob).toBe("24-06-2007");
      expect(res.registerNumber).toBe("2313289153");
      expect(res.marksScored).toBe("412");
      expect(res.maxMarks).toBe("600");
      expect(res.percentage).toBe("68.67%");
      expect(res.year).toBe("2024");
      expect(res.school).toBe("SWAMY VIVEKANANDAR MATRIC HR SEC SCHOOL KANCHAMALAYUR SALEM");
    });

    test("returns null safely when marksheet fields are missing", () => {
      const text = "A blank page without candidate data.";
      const res = extractMarksheetData(text, "ms10");
      expect(res.name).toBeNull();
      expect(res.marksScored).toBeNull();
      expect(res.year).toBeNull();
    });
  });

  describe("Community Certificate Field Extraction", () => {
    test("extracts candidate name, father name, category, and district from community certificate", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        REVENUE DEPARTMENT
        COMMUNITY CERTIFICATE
        This is to certify that Selvan NITHISHKUMAR M son of Thiru MURUGAN residing at Salem District
        belongs to Most Backward Class (MBC) community.
        Certificate No: TN-5202110011763
        Date of Issue: 11-10-2021
        Taluk : Salem South
        District : Salem
        Designation : Headquarters Deputy Tahsildar
      `;

      const res = extractCommunityCertificateData(text);
      expect(res.name).toBe("Nithishkumar M");
      expect(res.fatherName).toBe("Murugan");
      expect(res.communityCategory).toBe("MBC");
      expect(res.certNumber).toBe("TN-5202110011763");
      expect(res.issueDate).toBe("11-10-2021");
      expect(res.taluk).toBe("Salem South");
      expect(res.district).toBe("Salem");
      expect(res.issuingAuthority).toBe("Headquarters Deputy Tahsildar");
    });

    test("extracts candidate name, father name, caste (Chakkiliyan), category (SC), and district (Thiruchirappalli)", () => {
      const text = `
        வகுப்புச் சான்றிதழ்
        Community Certificate
        சான்றிதழ் எண் / Certificate No: TN-5202309155116 நாள் / Date: 20-09-2023
        This is to certify that Selvan Sivasubramaniyan E son of Thiru Elangovan residing at Door No. 628, Sakkiliyar street servaikaranpatti of M.kalathur Village / Town of Thottiam Taluk of Thiruchirappalli District of the State of Tamil Nadu belongs Chakkiliyan which is recognized as a Scheduled Caste as per the Scheduled Caste and Scheduled Tribes Orders (Amendment) Act. 1976 vide Serial No. 12.
        மாவட்டம் /District : Thiruchirappalli
        வட்டம் /Taluk : Thottiam
        பதவி /Designation : வட்டாட்சியர் /Tahsildar
      `;

      const res = extractCommunityCertificateData(text);
      expect(res.name).toBe("Sivasubramaniyan E");
      expect(res.fatherName).toBe("Elangovan");
      expect(res.communityCategory).toBe("SC");
      expect(res.community).toBe("Chakkiliyan");
      expect(res.certNumber).toBe("TN-5202309155116");
      expect(res.issueDate).toBe("20-09-2023");
      expect(res.taluk).toBe("Thottiam");
      expect(res.district).toBe("Thiruchirappalli");
      expect(res.issuingAuthority).toContain("Tahsildar");
    });
  });

  describe("Income Certificate Field Extraction", () => {
    test("extracts candidate name, income, validity period and flags expired certificate (>12 months)", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        REVENUE DEPARTMENT
        வருமானச் சான்றிதழ் / INCOME CERTIFICATE
        சான்றிதழ் எண் / Certificate No: TN-5202405111155 நாள் / Date: 11-05-2024
        This is to certify that Thiru Murugesan son of Thiru Rajamanikam residing at Salem District
        annual income from all sources is Rs. 1,50,000/- (Rupees One Lakh Fifty Thousand only).
        Certificate validity period : 11-05-2024 to 10-05-2025
        வட்டம் / Taluk : Salem South
        மாவட்டம் / District : Salem
        பதவி / Designation : Zonal Deputy Tahsildar
      `;

      const res = extractIncomeCertificateData(text);
      expect(res.name).toBe("Murugesan");
      expect(res.fatherName).toBe("Rajamanikam");
      expect(res.incomeNumber).toBe(150000);
      expect(res.income).toBe("₹1,50,000");
      expect(res.certNumber).toBe("TN-5202405111155");
      expect(res.issueDate).toBe("11-05-2024");
      expect(res.validUpto).toBe("10-05-2025");
      expect(res.taluk).toBe("Salem South");
      expect(res.district).toBe("Salem");
      expect(res.issuingAuthority).toBe("Zonal Deputy Tahsildar");
      expect(res.state).toBe("Tamil Nadu");
      expect(res.freshness.status).toBe("expired");
    });

    test("extracts Gujarat 3-year income certificate with applicant Karshan Naran Gojiya, father Naranbhai, and 3-year validity", () => {
      const text = `
        Government of Gujarat
        Income Certificate
        Certificate No. :: 10/2025
        Gram Panchayat Devaliya
        Devbhumi dwarka
        Date :: 16/04/2025
        This is certify that Mr. KARSHAN NARAN GOJIYA
        Son of NARANBHAI
        residing at JP DEVLIYA JAM KHAMBHALIYA DEV BHUMI DWARKA
        Vilage/City Devaliya Taluka Khambhalia District Devbhumi dwarka
        and his /her family's annual income from all the resources for last financial year is Rs.92000/-
        Rs. In words ( Ninety two Thousand Only )
        Total annual Income Rs. 92000
        This Certificate is valid for three years including the current financial year.
        Talati cum Mantri Gram Panchayat Devaliya
      `;

      const res = extractIncomeCertificateData(text);
      expect(res.name).toBe("Karshan Naran Gojiya");
      expect(res.fatherName).toBe("Naranbhai");
      expect(res.incomeNumber).toBe(92000);
      expect(res.income).toBe("₹92,000");
      expect(res.certNumber).toBe("10/2025");
      expect(res.issueDate).toBe("16-04-2025");
      expect(res.validUpto).toBe("16-04-2028");
      expect(res.taluk).toBe("Khambhalia");
      expect(res.district).toBe("Devbhumi Dwarka");
      expect(res.issuingAuthority).toBe("Talati Cum Mantri");
      expect(res.state).toBe("Gujarat");
      expect(res.freshness.status).toBe("valid");
    });

    test("correctly computes generic N-year stated validity from issue date and stated duration", () => {
      const text = `
        Income Certificate
        Date of Issue: 01/01/2026
        This is to certify that Mr. Amit Patel
        Total annual income Rs. 1,20,000
        This certificate is valid for 3 years from date of issue.
      `;

      const res = extractIncomeCertificateData(text);
      expect(res.name).toBe("Amit Patel");
      expect(res.incomeNumber).toBe(120000);
      expect(res.issueDate).toBe("01-01-2026");
      expect(res.validUpto).toBe("01-01-2029");
      expect(res.freshness.status).toBe("valid");
    });

    test("prioritizes explicit date range over stated duration when both are present", () => {
      const text = `
        Income Certificate
        Date of Issue: 01/01/2025
        This is to certify that Ms. Priya Sharma
        Total annual income Rs. 2,00,000
        This certificate is valid for 3 years.
        Certificate validity period : 01-01-2025 to 31-12-2027
      `;

      const res = extractIncomeCertificateData(text);
      expect(res.issueDate).toBe("01-01-2025");
      expect(res.validUpto).toBe("31-12-2027");
    });

    test("returns unknown status when no validity or issue date information exists", () => {
      const text = `
        Income Certificate
        This is to certify that Mr. Rajesh Kumar
        Total annual income Rs. 80,000
      `;

      const res = extractIncomeCertificateData(text);
      expect(res.name).toBe("Rajesh Kumar");
      expect(res.incomeNumber).toBe(80000);
      expect(res.issueDate).toBeNull();
      expect(res.validUpto).toBeNull();
      expect(res.freshness.status).toBe("unknown");
    });
  });
});
