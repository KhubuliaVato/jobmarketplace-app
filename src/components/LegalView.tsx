import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { THEME_PALETTES } from '../utils/bgThemes';

interface Props {
  onBack: () => void;
  initialTab?: 'terms' | 'privacy';
}

const CONTACT_EMAIL = 'vatokhubulia@gmail.com';
const COMPANY = 'FreeJob';
const LAST_UPDATED = '2026 წლის 17 ივლისი';

export default function LegalView({ onBack, initialTab = 'terms' }: Props) {
  const isDarkMode = useAuthStore((s) => s.isDarkMode);
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  const bgTheme = useAuthStore((state: any) => state.bgTheme) || 'noir';
  const palette = isDarkMode ? (THEME_PALETTES[bgTheme] || THEME_PALETTES.noir) : null;
  const theme = {
    bg: palette ? palette.bg : '#f5f5f7',
    cardBg: palette ? palette.card : '#ffffff',
    text: isDarkMode ? '#fff' : '#1c1c1e',
    subText: isDarkMode ? '#9a9aa2' : '#5a5a60',
    border: palette ? palette.border : '#e5e5ea',
    rowBg: isDarkMode ? '#1c1c22' : '#f2f2f7',
    accent: '#5B42F5',
  };

  const H = ({ children }: { children: string }) => (
    <Text style={[styles.h, { color: theme.text }]}>{children}</Text>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.p, { color: theme.subText }]}>{children}</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>იურიდიული ინფორმაცია</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.seg, { backgroundColor: theme.rowBg }]}>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'terms' && { backgroundColor: theme.accent }]}
          onPress={() => setTab('terms')}
        >
          <Text style={[styles.segText, { color: tab === 'terms' ? '#fff' : theme.subText }]}>წესები</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'privacy' && { backgroundColor: theme.accent }]}
          onPress={() => setTab('privacy')}
        >
          <Text style={[styles.segText, { color: tab === 'privacy' ? '#fff' : theme.subText }]}>კონფიდენციალურობა</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: theme.subText }]}>ბოლო განახლება: {LAST_UPDATED}</Text>

        {tab === 'terms' ? (
          <>
            <H>1. ზოგადი დებულებები</H>
            <P>წინამდებარე მომსახურების წესები და პირობები არეგულირებს {COMPANY}-ის მობილური აპლიკაციითა და მისი სერვისებით სარგებლობას. აპლიკაციის გამოყენებით თქვენ ეთანხმებით ამ წესებს. თუ არ ეთანხმებით, გთხოვთ, არ ისარგებლოთ სერვისით.</P>

            <H>2. სერვისის აღწერა</H>
            <P>{COMPANY} წარმოადგენს დასაქმების პლატფორმას, რომელიც აკავშირებს დამსაქმებლებსა (კომპანიები, კერძო პირები) და სამუშაოს მაძიებლებს. პლატფორმა უზრუნველყოფს ვაკანსიების განთავსებას, განაცხადების გაგზავნას, მხარეთა შორის კომუნიკაციასა და შეფასების სისტემას.</P>

            <H>3. რეგისტრაცია და ანგარიში</H>
            <P>• სერვისით სარგებლობა ნებადართულია 16 წლის და უფროსი ასაკის პირებისთვის.{'\n'}
            • რეგისტრაციისას ვალდებული ხართ მიუთითოთ სწორი და უტყუარი ინფორმაცია, მათ შორის მოქმედი მობილური ნომერი.{'\n'}
            • თქვენ პასუხისმგებელი ხართ თქვენი ანგარიშისა და პაროლის უსაფრთხოებაზე.{'\n'}
            • ერთ მობილურ ნომერზე დაიშვება მხოლოდ ერთი ანგარიში.</P>

            <H>4. მომხმარებლის ვალდებულებები</H>
            <P>აპლიკაციით სარგებლობისას აკრძალულია:{'\n'}
            • ყალბი, შეცდომაში შემყვანი ან თაღლითური ინფორმაციის განთავსება;{'\n'}
            • სხვისი პერსონალური მონაცემების უნებართვო გამოყენება;{'\n'}
            • შეურაცხმყოფელი, უხამსი ან კანონსაწინააღმდეგო შინაარსის გავრცელება;{'\n'}
            • სპამის ან არასასურველი რეკლამის გავრცელება;{'\n'}
            • პლატფორმის ტექნიკურ მუშაობაში ჩარევა.</P>

            <H>5. კონტენტი და მოდერაცია</H>
            <P>{COMPANY} იტოვებს უფლებას, საკუთარი შეხედულებისამებრ წაშალოს ან დამალოს ნებისმიერი განცხადება ან შინაარსი, რომელიც არღვევს ამ წესებს, აგრეთვე დაბლოკოს მომხმარებელი წესების დარღვევის შემთხვევაში. მომხმარებელს შეუძლია დააფიქსიროს საჩივარი სხვა მომხმარებელზე ან განცხადებაზე.</P>

            <H>6. პასუხისმგებლობის შეზღუდვა</H>
            <P>{COMPANY} წარმოადგენს შუამავალ პლატფორმას და არ არის მხარე დამსაქმებელსა და სამუშაოს მაძიებელს შორის დადებულ შეთანხმებაში. პლატფორმა არ იძლევა გარანტიას ვაკანსიების ან მომხმარებელთა უტყუარობაზე და არ აგებს პასუხს მხარეთა შორის წარმოშობილ დავებზე. მომსახურებით სარგებლობა ხდება საკუთარი რისკით.</P>

            <H>7. ინტელექტუალური საკუთრება</H>
            <P>აპლიკაციის დიზაინი, ლოგო, კოდი და შინაარსი წარმოადგენს {COMPANY}-ის საკუთრებას და დაცულია კანონმდებლობით.</P>

            <H>8. წესების ცვლილება</H>
            <P>{COMPANY} იტოვებს უფლებას, ნებისმიერ დროს შეცვალოს წინამდებარე წესები. მნიშვნელოვანი ცვლილებების შესახებ მომხმარებლები ინფორმირებული იქნებიან აპლიკაციის მეშვეობით.</P>

            <H>9. ანგარიშის გაუქმება</H>
            <P>თქვენ ნებისმიერ დროს შეგიძლიათ წაშალოთ თქვენი ანგარიში აპლიკაციის პარამეტრებიდან. {COMPANY} იტოვებს უფლებას, შეაჩეროს ან წაშალოს ანგარიში წესების დარღვევის შემთხვევაში.</P>

            <H>10. საკონტაქტო ინფორმაცია</H>
            <P>ნებისმიერი შეკითხვისთვის დაგვიკავშირდით: {CONTACT_EMAIL}</P>
          </>
        ) : (
          <>
            <H>1. შესავალი</H>
            <P>წინამდებარე კონფიდენციალურობის პოლიტიკა განმარტავს, თუ როგორ აგროვებს, იყენებს და იცავს {COMPANY} თქვენს პერსონალურ მონაცემებს. აპლიკაციით სარგებლობით თქვენ ეთანხმებით ამ პოლიტიკას.</P>

            <H>2. რა მონაცემებს ვაგროვებთ</H>
            <P>ჩვენ ვაგროვებთ შემდეგ ინფორმაციას:{'\n'}
            • საიდენტიფიკაციო მონაცემები: სახელი, მომხმარებლის სახელი;{'\n'}
            • საკონტაქტო მონაცემები: მობილურის ნომერი, ელ. ფოსტა;{'\n'}
            • პროფილის მონაცემები: ბიოგრაფია, უნარები, სფერო, პორტფოლიო, ავატარი;{'\n'}
            • დოკუმენტები: რეზიუმე/CV, რომელსაც თავად ატვირთავთ;{'\n'}
            • აქტივობის მონაცემები: განცხადებები, მიმოწერა, შეფასებები.</P>

            <H>3. როგორ ვიყენებთ მონაცემებს</H>
            <P>თქვენს მონაცემებს ვიყენებთ:{'\n'}
            • ანგარიშის შესაქმნელად და მართვისთვის;{'\n'}
            • მობილური ნომრის დასადასტურებლად (SMS კოდი);{'\n'}
            • დამსაქმებელსა და მაძიებელს შორის კავშირის უზრუნველსაყოფად;{'\n'}
            • სერვისის გასაუმჯობესებლად და უსაფრთხოების დასაცავად;{'\n'}
            • წესების დარღვევის აღმოსაჩენად.</P>

            <H>4. მესამე მხარეთა სერვისები</H>
            <P>ჩვენ ვიყენებთ სანდო მესამე მხარის სერვისებს:{'\n'}
            • Supabase — მონაცემთა ბაზა და ავთენტიფიკაცია;{'\n'}
            • ubill.ge — SMS შეტყობინებების გაგზავნა;{'\n'}
            • Resend — ელ. ფოსტის მიწოდება.{'\n'}
            ეს სერვისები ამუშავებენ მონაცემებს მხოლოდ ჩვენი დავალებით და საკუთარი უსაფრთხოების სტანდარტების შესაბამისად.</P>

            <H>5. მონაცემთა დაცვა</H>
            <P>თქვენი პაროლი ინახება დაშიფრული (ჰეშირებული) სახით და ჩვენთვისაც მიუწვდომელია. მონაცემებზე წვდომა შეზღუდულია და დაცულია თანამედროვე უსაფრთხოების მექანიზმებით.</P>

            <H>6. მონაცემთა გაზიარება</H>
            <P>ჩვენ არ ვყიდით და არ ვამხელთ თქვენს პერსონალურ მონაცემებს მესამე პირებზე მარკეტინგული მიზნებით. პროფილის საჯარო ინფორმაცია (სახელი, ავატარი, უნარები, შეფასება) ხილვადია სხვა მომხმარებლებისთვის. მობილურის ნომერი და ელ. ფოსტა არ არის საჯარო.</P>

            <H>7. თქვენი უფლებები</H>
            <P>თქვენ გაქვთ უფლება:{'\n'}
            • ნახოთ და შეასწოროთ თქვენი მონაცემები;{'\n'}
            • წაშალოთ თქვენი ანგარიში და მასთან დაკავშირებული მონაცემები;{'\n'}
            • მოითხოვოთ ინფორმაცია თქვენი მონაცემების დამუშავების შესახებ.</P>

            <H>8. მონაცემთა შენახვის ვადა</H>
            <P>თქვენს მონაცემებს ვინახავთ ანგარიშის აქტიურობის განმავლობაში. ანგარიშის წაშლისას მონაცემები იშლება, გარდა იმ შემთხვევებისა, როცა კანონმდებლობა მოითხოვს მათ შენახვას.</P>

            <H>9. ბავშვთა კონფიდენციალურობა</H>
            <P>სერვისი განკუთვნილია 16 წლის და უფროსი ასაკის პირებისთვის. ჩვენ შეგნებულად არ ვაგროვებთ 16 წლამდე პირების მონაცემებს.</P>

            <H>10. ცვლილებები</H>
            <P>ეს პოლიტიკა შესაძლოა დროდადრო განახლდეს. მნიშვნელოვანი ცვლილებების შესახებ შეგატყობინებთ აპლიკაციის მეშვეობით.</P>

            <H>11. კონტაქტი</H>
            <P>კონფიდენციალურობასთან დაკავშირებული შეკითხვებისთვის: {CONTACT_EMAIL}</P>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 44, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  seg: { flexDirection: 'row', margin: 16, borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segText: { fontSize: 13.5, fontWeight: '700' },
  scroll: { paddingHorizontal: 20 },
  updated: { fontSize: 12, marginBottom: 16, fontStyle: 'italic' },
  h: { fontSize: 15.5, fontWeight: '800', marginTop: 18, marginBottom: 6 },
  p: { fontSize: 13.5, lineHeight: 21 },
});