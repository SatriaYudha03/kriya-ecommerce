package main
import (
"fmt"
"os"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)
func main() {
db, _ := gorm.Open(postgres.Open(os.Getenv("SUPABASE_DB_URL")), &gorm.Config{})
err := db.Exec("UPDATE auth.users SET encrypted_password = crypt('kriya12345', gen_salt('bf')) WHERE email = 'admin@kriya.com'").Error
if err != nil { fmt.Printf("Error: %v\n", err) } else { fmt.Println("Updated") }
}
