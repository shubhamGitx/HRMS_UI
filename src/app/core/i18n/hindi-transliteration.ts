/**
 * Comprehensive Hindi Transliteration Utility for Indian Names
 * Accurately transliterates English name spellings into Devanagari Hindi.
 */

const knownNames: Record<string, string> = {
  // Common Titles
  mr: 'श्री', ms: 'सुश्री', mrs: 'श्रीमती', dr: 'डॉ.', shri: 'श्री', smt: 'श्रीमती', km: 'सुश्री',

  // Names starting with A
  aakash: 'आकाश', aarti: 'आरती', aashish: 'आशीष', abhay: 'अभय', abhinav: 'अभिनव', abhishek: 'अभिषेक',
  acharya: 'आचार्य', adarsh: 'आदर्श', aditya: 'आदित्य', agarwal: 'अग्रवाल', aggarwal: 'अग्रवाल',
  agrahari: 'अग्रहरि', ahmed: 'अहमद', ajay: 'अजय', ajit: 'अजीत', ajeet: 'अजीत', akash: 'आकाश',
  akhilesh: 'अखिलेश', alam: 'आलम', alok: 'आलोक', aman: 'अमन', amar: 'अमर', amardeep: 'अमरदीप',
  amarjeet: 'अमरजीत', ambika: 'अंबिका', amit: 'अमित', amitabh: 'अमिताभ', anand: 'आनंद', ananya: 'अनन्या',
  anil: 'अनिल', aniruddh: 'अनिरुद्ध', anita: 'अनिता', anjali: 'अंजलि', ankit: 'अंकित', ankita: 'अंकिता',
  anmol: 'अनमोल', ansari: 'अंसारी', anshu: 'अंशु', anshuman: 'अंशुमान', anupam: 'अनुपम', anuradha: 'अनुराधा',
  anurag: 'अनुराग', anushka: 'अनुष्का', aparna: 'अपर्णा', archana: 'अर्चना', arjun: 'अर्जुन', arti: 'आरती',
  arun: 'अरुण', arundhati: 'अरुंधती', arvind: 'अरविंद', arya: 'आर्य', ashish: 'आशीष', ashok: 'अशोक',
  ashutosh: 'आशुतोष', ashwini: 'अश्विनी', avinash: 'अविनाश', awadhesh: 'अवधेश', ayush: 'आयुष', ayushi: 'आयुषी',

  // Names starting with B
  babita: 'बबिता', bablu: 'बबलू', bajpai: 'वाजपेयी', balram: 'बलराम', banerjee: 'बनर्जी', basant: 'बसंत',
  bassi: 'बस्सी', bhagwan: 'भगवान', bhagwati: 'भगवती', bhalla: 'भल्ला', bhanu: 'भानु', bharat: 'भारत',
  bharti: 'भारती', bhatia: 'भाटिया', bhatt: 'भट्ट', bhattacharya: 'भट्टाचार्य', bhola: 'भोला',
  bhuvan: 'भुवन', bihari: 'बिहारी', bindu: 'बिंदु', bipin: 'बिपिन', birendra: 'बीरेंद्र', birju: 'बिरजू',
  brajesh: 'ब्रजेश', brij: 'बृज', brijesh: 'ब्रिजेश', brijmohan: 'बृजमोहन',

  // Names starting with C
  chaitanya: 'चैतन्य', chaman: 'चमन', champa: 'चंपा', chandan: 'चंदन', chandra: 'चंद्र', chandrakant: 'चंद्रकांत',
  chandraprabha: 'चंद्रप्रभा', chandraprakash: 'चंद्रप्रकाश', chandrashekhar: 'चंद्रशेखर', charu: 'चारु',
  chaudhary: 'चौधरी', chauhan: 'चौहान', chhavi: 'छवि', chhotelal: 'छोटेलाल', choudhary: 'चौधरी',

  // Names starting with D
  dalip: 'दलीप', damodar: 'दामोदर', darshan: 'दर्शन', daryani: 'दरयानी', das: 'दास', dashrath: 'दशरथ',
  daya: 'दया', dayanand: 'दयानंद', deep: 'दीप', deepa: 'दीपा', deepak: 'दीपक', deepali: 'दीपाली',
  deepika: 'दीपिका', deepti: 'दीप्ति', dev: 'देव', devendra: 'देवेंद्र', devi: 'देवी', devraj: 'देवराज',
  dhananjay: 'धनंजय', dharmendra: 'धर्मेंद्र', dharmik: 'धार्मिक', dhawan: 'धवन', dheeraj: 'धीरज',
  dhruv: 'ध्रुव', dilip: 'दिलीप', dinesh: 'दिनेश', dipak: 'दीपक', dipti: 'दीप्ति', divya: 'दिव्या',
  divyansh: 'दिव्यांश', diwakar: 'दिवाकर', dixit: 'दीक्षित', dubey: 'दुबे', durga: 'दुर्गा', dushyant: 'दुष्यंत',

  // Names starting with G
  gagan: 'गगन', gajendra: 'गजेंद्र', ganesh: 'गणेश', ganga: 'गंगा', garima: 'गरिमा', gaurav: 'गौरव',
  gautam: 'गौतम', gayatri: 'गायत्री', geeta: 'गीता', ghanashyam: 'घनश्याम', giridhar: 'गिरिधर',
  giriraj: 'गिरिराज', girish: 'गिरीश', gita: 'गीता', gitanjali: 'गीतांजलि', gopal: 'गोपाल', gopi: 'गोपी',
  govind: 'गोविंद', gulab: 'गुलाब', gulshan: 'गुलशन', gunjan: 'गुंजन', gupta: 'गुप्ता', gyan: 'ज्ञान',
  gyanendra: 'ज्ञानेंद्र',

  // Names starting with H
  hanuman: 'हनुमान', hardik: 'हार्दिक', haresh: 'हरेश', hari: 'हरि', harikant: 'हरिकांत', hariom: 'हरिओम',
  hariprasad: 'हरिप्रसाद', harish: 'हरीश', harishchandra: 'हरिश्चंद्र', harsh: 'हर्ष', harsha: 'हर्षा',
  harshit: 'हर्षित', harshita: 'हर्षिता', hemant: 'हेमंत', hemlata: 'हेमलता', hira: 'हीरा', hiralal: 'हीरालाल',
  hitesh: 'हितेश', hrithik: 'ऋतिक',

  // Names starting with I
  ila: 'इला', inder: 'इंदर', inderjeet: 'इंदरजीत', indira: 'इंदिरा', indu: 'इंदु', indubala: 'इंदुबाला',
  ishwar: 'ईश्वर', ishita: 'इशिता',

  // Names starting with J
  jagadish: 'जगदीश', jagannath: 'जगन्नाथ', jagat: 'जगत', jagdish: 'जगदीश', jageshwar: 'जंगेश्वर',
  jai: 'जय', jaikant: 'जयकांत', jain: 'जैन', jaiprakash: 'जयप्रकाश', jairam: 'जयराम', jaishankar: 'जयशंकर',
  janak: 'जनक', janardan: 'जनार्दन', janki: 'जानकी', jaswant: 'जसवंत', jatin: 'जतिन', javed: 'जावेद',
  jaya: 'जया', jayant: 'जयंत', jayanti: 'जयंती', jayshree: 'जयश्री', jeevan: 'जीवन', jha: 'झा',
  jindal: 'जिंदल', jitendra: 'जितेंद्र', jitesh: 'जितेश', ji: 'जी', joshi: 'जोशी', jugal: 'जुगल',
  jyoti: 'ज्योति', jyotsna: 'ज्योत्स्ना',

  // Names starting with K
  kailash: 'कैलाश', kailashpati: 'कैलाशपति', kajal: 'काजल', kalavati: 'कलावती', kali: 'काली',
  kalpana: 'कल्पना', kalyan: 'कल्याण', kalyani: 'कल्याणी', kamal: 'कमल', kamala: 'कमला', kamini: 'कामिनी',
  kamlesh: 'कमलेश', kanchan: 'कंचन', kanhaiya: 'कन्हैया', kanta: 'कांता', kanti: 'कांति', kapil: 'कपिल',
  kapoor: 'कपूर', karan: 'करण', kartik: 'कार्तिक', kashyap: 'कश्यप', kaushal: 'कौशल', kaushik: 'कौशिक',
  kaushilya: 'कौशल्या', kavita: 'कविता', kedia: 'केडिया', keshav: 'केशव', keshri: 'केशरी', kewal: 'केवल',
  khan: 'खान', khanna: 'खन्ना', khare: 'खरे', khemka: 'खेमका', khushboo: 'खुशबू', khushi: 'खुशी',
  kiran: 'किरण', kirti: 'कीर्ति', kishore: 'किशोर', kishori: 'किशोरी', kishan: 'किशन', komal: 'कोमल',
  krishna: 'कृष्ण', krishnamurti: 'कृष्णमूर्ति', kuldeep: 'कुलदीप', kumar: 'कुमार', kumari: 'कुमारी',
  kundan: 'कुंदन', kunti: 'कुंती', kush: 'कुश', kushwaha: 'कुशवाहा',

  // Names starting with L
  lakhan: 'लखन', lakshmi: 'लक्ष्मी', lal: 'लाल', lalan: 'ललन', lalita: 'ललिता', lalit: 'ललित',
  lalitendra: 'ललितेंद्र', lata: 'लता', lav: 'लव', laxman: 'लक्ष्मण', laxmi: 'लक्ष्मी', leela: 'लीला',
  lodhi: 'लोधी', lohiya: 'लोहिया', lokendra: 'लोकेंद्र', lokesh: 'लोकेश',

  // Names starting with M
  madan: 'मदन', madhav: 'माधव', madhu: 'मधु', madhukar: 'मधुकर', madhulika: 'मधुलिका', madhuri: 'माधुरी',
  mahadev: 'महादेव', mahavir: 'महावीर', mahendra: 'महेंद्र', mahesh: 'महेश', maheshwari: 'माहेश्वरी',
  mahipal: 'महिपाल', mamta: 'ममता', manas: 'मानस', manav: 'मानव', mandar: 'मंदार', mandira: 'मंदिरा',
  mangal: 'मंगल', mani: 'मणि', manik: 'माणिक', manish: 'मनीष', manisha: 'मनीषा', manju: 'मंजू',
  manjula: 'मंजुला', manmohan: 'मनमोहन', manohar: 'मनोहर', manoj: 'मनोज', manorama: 'मनोरमा',
  manvendra: 'मानवेंद्र', mayank: 'मयंक', md: 'मो.', meena: 'मीना', meenakshi: 'मीनाक्षी', meera: 'मीरा',
  megha: 'मेघा', mehta: 'मेहता', mishra: 'मिश्रा', mitali: 'मिताली', mohammad: 'मोहम्मद', mohammed: 'मोहम्मद',
  mohan: 'मोहन', mohini: 'मोहिनी', mohit: 'मोहित', mona: 'मोना', monika: 'मोनिका', moti: 'मोती',
  motilal: 'मोतीलाल', mridula: 'मृदुला', mukesh: 'मुकेश', mukul: 'मुकुल', mukund: 'मुकुंद', munna: 'मुन्ना',
  murali: 'मुरली', murari: 'मुरारी',

  // Names starting with N
  nagendra: 'नागेंद्र', nagesh: 'नागेश', nalini: 'नलिनी', namrata: 'नम्रता', nanda: 'नंदा', nandini: 'नंदिनी',
  nandkishore: 'नंदकिशोर', narayan: 'नारायण', narendra: 'नरेंद्र', naresh: 'नरेश', narmada: 'नर्मदा',
  natwarlal: 'नटवरलाल', naveen: 'नवीन', navin: 'नवीन', navneet: 'नवनीत', nawal: 'नवल', neelam: 'नीलम',
  neelima: 'नीलिमा', neelu: 'नीलू', neena: 'नीना', neeraj: 'नीरज', neeru: 'नीरू', neha: 'नेहा',
  nidhi: 'निधि', nikhil: 'निखिल', nilam: 'नीलम', nilesh: 'नीलेश', nirmal: 'निर्मल', nirmala: 'निर्मला',
  nisha: 'निशा', nishant: 'निशांत', nishtha: 'निष्ठा', nitesh: 'नितेश', nitin: 'नितिन', nitish: 'नीतीश',
  nitu: 'नीतू',

  // Names starting with O & P
  om: 'ओम', omprakash: 'ओमप्रकाश', omkar: 'ओंकार', oza: 'ओझा',
  pallavi: 'पल्लवी', pandey: 'पांडेय', pandit: 'पंडित', pankaj: 'पंकज', paras: 'पारस', paresh: 'परेश',
  parikshit: 'परीक्षित', parmeshwar: 'परमेश्वर', parminder: 'परमिंदर', parul: 'पारुल', parvati: 'पार्वती',
  paswan: 'पासवान', patel: 'पटेल', pathak: 'पाठक', patnaik: 'पटनायक', pawan: 'पवन', pawankumar: 'पवनकुमार',
  payal: 'पायल', phoolchand: 'फूलचंद', piyush: 'पीयूष', pooja: 'पूजा', poonam: 'पूनम', prabha: 'प्रभा',
  prabhat: 'प्रभात', prabhu: 'प्रभु', pradeep: 'प्रदीप', pradip: 'प्रदीप', praful: 'प्रफुल्ल',
  prakash: 'प्रकाश', prakashbhai: 'प्रकाशभाई', prakashchandra: 'प्रकाशचंद्र', pramod: 'प्रमोद',
  pranab: 'प्रणब', pranav: 'प्रणव', prasad: 'प्रसाद', prashant: 'प्रशांत', pratapsingh: 'प्रतापसिंह',
  pratibha: 'प्रतिभा', pratik: 'प्रतीक', pratiksha: 'प्रतीक्षा', pravin: 'प्रवीण', praveen: 'प्रवीण',
  preeti: 'प्रीति', prem: 'प्रेम', premlata: 'प्रेमलता', prerna: 'प्रेरणा', priya: 'प्रिया',
  priyanka: 'प्रियंका', puja: 'पूजा', punit: 'पुनीत', purshottam: 'पुरुषोत्तम', pushpa: 'पुष्पा',
  pushpendra: 'पुष्पेंद्र', pyarelal: 'प्यारेलाल',

  // Names starting with R
  rachna: 'रचना', radha: 'राधा', radhe: 'राधे', radheshyam: 'राधेश्याम', raghav: 'राघव', raghuvir: 'रघुवीर',
  rahul: 'राहुल', raj: 'राज', rajani: 'रजनी', rajat: 'रजत', rajeev: 'राजीव', rajendra: 'राजेंद्र',
  rajesh: 'राजेश', rajiv: 'राजीव', rajkumar: 'राजकुमार', rajkumari: 'राजकुमारी', rajlaxmi: 'राजलक्ष्मी',
  rajneesh: 'रजनीश', rajni: 'रजनी', rajpal: 'राजपाल', rajput: 'राजपूत', rakesh: 'राकेश', ram: 'राम',
  ramachandran: 'रामचंद्रन', ramakant: 'रमाकांत', raman: 'रमन', ramanand: 'रामानंद', ramavtar: 'रामावतार',
  ramchandra: 'रामचंद्र', ramdas: 'रामदास', ramesh: 'रमेश', rameshwar: 'रामेश्वर', ramji: 'रामजी',
  ramkumar: 'रामकुमार', rammohan: 'राममोहन', ramnaresh: 'रामनरेश', rampal: 'पाल', ramprakash: 'रामप्रकाश',
  ramprasad: 'रामप्रसाद', ramrati: 'रामरती', ramswaroop: 'रामस्वरूप', rana: 'राना', rani: 'रानी',
  ranjan: 'रंजन', ranjana: 'रंजना', ranjit: 'रणजीत', rashmi: 'रश्मि', ratan: 'रतन', ratnesh: 'रत्नेश',
  ravan: 'रावण', ravi: 'रवि', ravindra: 'रवींद्र', ravish: 'रविश', rekha: 'रेखा', renu: 'रेणु',
  renuka: 'रेणुका', rina: 'रीना', rinki: 'रिंकी', rinku: 'रिंकू', risha: 'रीशा', rishabh: 'ऋषभ',
  rishi: 'ऋषि', rita: 'रीता', ritu: 'ऋतु', riya: 'रिया', rohan: 'रोहन', rohit: 'रोहित',
  roop: 'रूप', roopam: 'रूपम', roshani: 'रोशनी', roshni: 'रोशनी', ruchi: 'रुचि', ruchika: 'रुचिका',
  rupa: 'रूपा', rupesh: 'रूपेश',

  // Names starting with S
  sachin: 'सचिन', sadhana: 'साधना', sagar: 'सागर', sah: 'साह', saha: 'साहा', sahani: 'साहनी',
  sahay: 'सहाय', sahu: 'साहू', sain: 'सैन', saini: 'सैनी', sajjan: 'सज्जन', sakshi: 'साक्षी',
  salim: 'सलीम', sameer: 'समीर', samir: 'समीर', sandeep: 'संदीप', sangam: 'संगम', sangeeta: 'संगीता',
  sangita: 'संगीता', sanjay: 'संजय', sanjeev: 'संजीव', sanjiv: 'संजीव', santosh: 'संतोष', santoshi: 'संतोषी',
  sarita: 'सरिता', sarla: 'सरला', saroj: 'सरोज', sarojini: 'सरोजिनी', sarthak: 'सार्थक', sarvesh: 'सर्वेश',
  satendra: 'सतेंद्र', satish: 'सतीश', satpal: 'सतपाल', satya: 'सत्य', satyanarayan: 'सत्यनारायण',
  satyaprakash: 'सत्यप्रकाश', saurabh: 'सौरभ', savita: 'सविता', savitri: 'सावित्री', sayeed: 'सईद',
  seema: 'सीमा', seeta: 'सीता', shabana: 'शबाना', shailendra: 'शैलेंद्र', shailesh: 'शैलेश',
  shailja: 'शैलजा', shakti: 'शक्ति', shakuntala: 'शकुंतला', shambhu: 'शंभू', shankar: 'शंकर',
  shankarlal: 'शंकरलाल', shanti: 'शांति', sharad: 'शरद', sharda: 'शारदा', sharma: 'शर्मा', shashi: 'शशि',
  shashibhushan: 'शशिभूषण', shashikant: 'शशिकांत', shatrughan: 'शत्रुघ्न', sheetal: 'शीतल', shekhar: 'शेखर',
  shikha: 'शिखा', shilpa: 'शिल्पा', shishir: 'शिशिर', shiv: 'शिव', shiva: 'शिव', shivam: 'शिवम',
  shivani: 'शिवानी', shivendra: 'शिवेंद्र', shivkumar: 'शिवकुमार', shivram: 'शिवराम', shobha: 'शोभा',
  shobhit: 'शोभित', shraddha: 'श्रद्धा', shrawan: 'श्रवण', shree: 'श्री', shreekant: 'श्रीकांत',
  shreenath: 'श्रीनाथ', shreeprakash: 'श्रीप्रकाश', shreeram: 'श्रीराम', shrey: 'श्रेय', shreya: 'श्रेया',
  shrikant: 'श्रीकांत', shrimati: 'श्रीमती', shrinath: 'श्रीनाथ', shriprakash: 'श्रीप्रकाश',
  shriram: 'श्रीराम', shruti: 'श्रुति', shubham: 'शुभम', shukla: 'शुक्ला', shweta: 'श्वेता',
  shyam: 'श्याम', shyambabu: 'श्यामबाबू', shyamlal: 'श्यामलाल', siddharth: 'सिद्धार्थ', sidhartha: 'सिद्धार्थ',
  sima: 'सीमा', singh: 'सिंह', singhal: 'सिंघल', sinha: 'सिन्हा', sita: 'सीता', sitaram: 'सीताराम',
  sneha: 'स्नेहा', snehlata: 'स्नेहलता', sohan: 'सोहन', sohanlal: 'सोहनलाल', somesh: 'सोमेश',
  sona: 'सोना', sonal: 'सोनल', sonam: 'सोनम', soni: 'सोनी', sonu: 'सोनू', sourav: 'सौरव',
  srivastava: 'श्रीवास्तव', subhash: 'सुभाष', subodh: 'सुबोध', sudama: 'सुदामा', sudarshan: 'सुदर्शन',
  sudha: 'सुधा', sudhanshu: 'सुधांशु', sudhir: 'सुधीर', suhas: 'सुहास', sujata: 'सुजाता', sukhdev: 'सुखदेव',
  sukriti: 'सुकृति', suleman: 'सुलेमान', suman: 'सुमन', sumant: 'सुमंत', sumati: 'सुमति', sumeet: 'सुमीत',
  sumit: 'सुमित', sumitra: 'सुमित्रा', sunaina: 'सुनयना', sundar: 'सुंदर', sunil: 'सुनील', sunita: 'सुनीता',
  suraj: 'सूरज', surajbhan: 'सूरजभान', surbhi: 'सुरभि', surendra: 'सुरेंद्र', suresh: 'सुरेश',
  suri: 'सूरी', surya: 'सूर्य', suryakant: 'सूर्यकांत', sushant: 'सुशांत', sushil: 'सुशील',
  sushila: 'सुशीला', sushma: 'सुषमा', swami: 'स्वामी', swapnil: 'स्वप्निल', swarnlata: 'स्वर्णलता',
  swati: 'स्वाति', sweta: 'श्वेता',

  // Names starting with T, U, V, Y
  tandon: 'टंडन', tanmay: 'तन्मय', tanu: 'तनु', tanuja: 'तनुजा', tanvi: 'तन्वी', tapesh: 'तपेश',
  tara: 'तारा', tarun: 'तरुण', tej: 'तेज', tejnarayan: 'तेजनारायण', tejpal: 'तेजपाल', thakur: 'ठाकुर',
  tiwari: 'तिवारी', tomar: 'तोमर', trilok: 'त्रिलोक', tripti: 'तृप्ति', trivedi: 'त्रिवेदी', tulsi: 'तुलसी',
  tulsidas: 'तुलसीदास', tushar: 'तुषार',
  uday: 'उदय', udit: 'उदित', ujjwal: 'उज्ज्वल', uma: 'उमा', umakant: 'उमाकांत', umashankar: 'उमाशंकर',
  umesh: 'उमेश', upadhyay: 'उपाध्याय', upendra: 'उपेंद्र', urvashi: 'उर्वशी', usha: 'उषा',
  vaibhav: 'वैभव', vaishali: 'वैशाली', vandana: 'वंदना', varsha: 'वर्षा', varun: 'वरुण',
  vasant: 'वसंत', vasudev: 'वासुदेव', ved: 'वेद', vedprakash: 'वेदप्रकाश', veena: 'वीणा',
  verma: 'वर्मा', vidya: 'विद्या', vidyanand: 'विद्यानंद', vidyapati: 'विद्यापति', vijay: 'विजय',
  vijaylaxmi: 'विजयलक्ष्मी', vikas: 'विकास', vikash: 'विकास', vikram: 'विक्रम', vimal: 'विमल',
  vinay: 'विनय', vinod: 'विनोद', vipin: 'विपिन', viplav: 'विप्लव', vipul: 'विपुल', virat: 'विराट',
  virendra: 'वीरेंद्र', vishal: 'विशाल', vishnu: 'विष्णु', vishwa: 'विश्व', vishwakarma: 'विश्वकर्मा',
  vishwamitra: 'विश्वामित्र', vishwanath: 'विश्वनाथ', vivek: 'विवेक',
  yadav: 'यादव', yash: 'यश', yashoda: 'यशोदा', yashwant: 'यशवंत', yogendra: 'योगेंद्र', yogesh: 'योगेश',
  yogita: 'योगिता'
};

// Suffix Rules to recognize standard Indian name endings
const suffixRules: Array<{ suffix: string; hindi: string }> = [
  { suffix: 'prakash', hindi: 'प्रकाश' },
  { suffix: 'kash', hindi: 'काश' },
  { suffix: 'prasad', hindi: 'प्रसाद' },
  { suffix: 'shankar', hindi: 'शंकर' },
  { suffix: 'narayan', hindi: 'नारायण' },
  { suffix: 'shekhar', hindi: 'शेखर' },
  { suffix: 'babu', hindi: 'बाबू' },
  { suffix: 'kumar', hindi: 'कुमार' },
  { suffix: 'kumari', hindi: 'कुमारी' },
  { suffix: 'chand', hindi: 'चंद' },
  { suffix: 'chandra', hindi: 'चंद्र' },
  { suffix: 'swaroop', hindi: 'स्वरूप' },
  { suffix: 'deep', hindi: 'दीप' },
  { suffix: 'kant', hindi: 'कांत' },
  { suffix: 'kanta', hindi: 'कांता' },
  { suffix: 'nath', hindi: 'नाथ' },
  { suffix: 'lal', hindi: 'लाल' },
  { suffix: 'pal', hindi: 'पाल' },
  { suffix: 'ram', hindi: 'राम' },
  { suffix: 'vati', hindi: 'वती' },
  { suffix: 'wati', hindi: 'वती' },
  { suffix: 'mati', hindi: 'मती' },
  { suffix: 'jeet', hindi: 'जीत' },
  { suffix: 'veer', hindi: 'वीर' },
  { suffix: 'raj', hindi: 'राज' },
  { suffix: 'eshwar', hindi: 'ईश्वर' },
  { suffix: 'esh', hindi: 'ेश' },
  { suffix: 'endra', hindi: 'ेंद्र' },
  { suffix: 'anand', hindi: 'ानंद' }
];

const consonants: Record<string, string> = {
  ksh: 'क्ष', gya: 'ज्ञ', chh: 'छ', kh: 'ख', gh: 'घ', ch: 'च', jh: 'झ', th: 'थ', dh: 'ध',
  ph: 'फ', bh: 'भ', sh: 'श', k: 'क', g: 'ग', c: 'क', j: 'ज', t: 'त', d: 'द', n: 'न', p: 'प',
  f: 'फ', b: 'ब', m: 'म', y: 'य', r: 'र', l: 'ल', v: 'व', w: 'व', s: 'स', h: 'ह', q: 'क',
  x: 'क्स', z: 'ज'
};

const vowels: Record<string, { independent: string; matra: string }> = {
  aa: { independent: 'आ', matra: 'ा' },
  ai: { independent: 'ऐ', matra: 'ै' },
  au: { independent: 'औ', matra: 'ौ' },
  ee: { independent: 'ई', matra: 'ी' },
  ii: { independent: 'ई', matra: 'ी' },
  oo: { independent: 'ऊ', matra: 'ू' },
  uu: { independent: 'ऊ', matra: 'ू' },
  a: { independent: 'अ', matra: '' },
  i: { independent: 'इ', matra: 'ि' },
  e: { independent: 'ए', matra: 'े' },
  u: { independent: 'उ', matra: 'ु' },
  o: { independent: 'ओ', matra: 'ो' }
};

function transliterateWord(source: string): string {
  const lower = source.toLowerCase();
  
  // 1. Direct dictionary match
  if (knownNames[lower]) return knownNames[lower];

  // 2. Check compound / suffix rules (e.g. OmPrakash, JayPrakash, VedPrakash, RamKripal)
  for (const rule of suffixRules) {
    if (lower.length > rule.suffix.length && lower.endsWith(rule.suffix)) {
      const prefix = lower.slice(0, lower.length - rule.suffix.length);
      const prefixHindi = knownNames[prefix] || transliterateWord(prefix);
      if (prefixHindi) {
        return prefixHindi + rule.hindi;
      }
    }
  }

  // 3. Fallback character-by-character transliteration
  let output = '', i = 0, afterConsonant = false;
  const consonantKeys = Object.keys(consonants).sort((a, b) => b.length - a.length);
  const vowelKeys = Object.keys(vowels).sort((a, b) => b.length - a.length);

  while (i < lower.length) {
    const vowel = vowelKeys.find(k => lower.startsWith(k, i));
    if (vowel) {
      const value = vowels[vowel];
      // Trailing 'a' at end of Indian names usually means 'ा' (e.g. Rama, Pooja, Mishra, Gupta)
      const isTrailingA = (vowel === 'a' && afterConsonant && i === lower.length - 1);
      output += afterConsonant ? (isTrailingA ? 'ा' : value.matra) : value.independent;
      afterConsonant = false;
      i += vowel.length;
      continue;
    }

    const consonant = consonantKeys.find(k => lower.startsWith(k, i));
    if (consonant) {
      if (afterConsonant) output += '्';
      output += consonants[consonant];
      afterConsonant = true;
      i += consonant.length;
      continue;
    }

    output += source[i];
    afterConsonant = false;
    i++;
  }
  return output;
}

export function transliterateHindiName(value: string): string {
  if (!value) return '';
  return value.split(/(\s+|[-.'’])/).map(part => /^[A-Za-z]+$/.test(part) ? transliterateWord(part) : part).join('');
}
