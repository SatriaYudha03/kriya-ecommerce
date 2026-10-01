package main
import (
"fmt"
"os"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)
func main() {
db, _ := gorm.Open(postgres.Open(os.Getenv("SUPABASE_DB_URL")), &gorm.Config{})
var users []map[string]interface{}
db.Table("auth.users").Where("email LIKE ?", "%admin%").Find(&users)
for _, u := range users {
fmt.Printf("Email: %v\n", u["email"])
}
}
